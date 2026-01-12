import { Note, Comment, User, Report, Suggestion } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient';
import mammoth from 'mammoth';

/* 
 * SQL SCHEMA REQUIREMENTS FOR THIS SERVICE:
 * 
 * 1. Add trust_points to profiles:
 *    ALTER TABLE profiles ADD COLUMN trust_points INTEGER DEFAULT 0;
 * 
 * 2. Create suggestions table:
 *    CREATE TABLE suggestions (
 *      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *      user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
 *      content TEXT NOT NULL,
 *      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 *    );
 */

// Effectively this is now the 'apiService'.
export const mockDb = {
  
  // --- USER PROFILE ---

  updateUserProfile: async (
    userId: string, 
    email: string, 
    updates: { name: string, oldPassword?: string, newPassword?: string, file?: File | null }
  ): Promise<void> => {
    
    // 1. Password Update Logic
    // If a new password is provided, we MUST verify the old password first.
    if (updates.newPassword && updates.newPassword.trim() !== "") {
        if (!updates.oldPassword) {
            throw new Error("Old password is required to set a new password.");
        }

        // Re-authenticate to verify old password matches database hash
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: updates.oldPassword
        });

        if (signInError) {
            throw new Error("Incorrect old password.");
        }

        // Update to new password
        const { error: updatePwError } = await supabase.auth.updateUser({
            password: updates.newPassword
        });

        if (updatePwError) throw updatePwError;
    }

    // 2. Avatar Upload Logic
    let avatarUrl: string | undefined = undefined;
    if (updates.file) {
        const fileExt = updates.file.name.split('.').pop();
        const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
        
        // Upload to 'course_materials' bucket (assuming it's the main public bucket available)
        // Ideally this should be a separate 'avatars' bucket, but we'll use what's configured.
        const { error: uploadError } = await supabase.storage
            .from('course_materials')
            .upload(fileName, updates.file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
            .from('course_materials')
            .getPublicUrl(fileName);
            
        avatarUrl = publicUrl;
    }

    // 3. Profile Table Update (Name & Avatar)
    // We strictly ONLY update name and avatar. Role and Trust Points are excluded here.
    const profileUpdates: any = {
        name: updates.name,
        updated_at: new Date().toISOString()
    };

    if (avatarUrl) {
        profileUpdates.avatar_url = avatarUrl;
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

    if (profileError) throw new Error(profileError.message);
    
    // 4. Update Auth Metadata (to keep session in sync locally if needed)
    await supabase.auth.updateUser({
        data: {
            name: updates.name,
            avatar_url: avatarUrl // might be undefined, which is fine
        }
    });
  },

  // --- NOTES ---

  getNotes: async (): Promise<Note[]> => {
    try {
        // Join with profiles to get uploader name
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            uploader:profiles!uploader_id (name)
          `)
          .order('date', { ascending: false });

        if (error) {
            console.error("Error fetching notes:", error.message);
            return [];
        }

        // Also fetch upvotes to display accurate counts
        const { data: upvotesData } = await supabase.from('upvotes').select('note_id');

        return (data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          major: n.major,
          category: n.category,
          uploaderId: n.uploader_id,
          uploaderName: n.uploader?.name || 'Unknown',
          date: n.date,
          fileUrl: n.file_url,
          fileType: n.file_type as any,
          isApproved: n.is_approved,
          upvotes: upvotesData?.filter((u: any) => u.note_id === n.id).length || 0
        }));
    } catch (e) {
        console.error("Unexpected error in getNotes:", e);
        return [];
    }
  },

  getMyNotes: async (userId: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select(`*, uploader:profiles!uploader_id (name)`)
      .eq('uploader_id', userId);

    if (error) return [];
    
    const { data: upvotesData } = await supabase.from('upvotes').select('note_id');

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      major: n.major,
      category: n.category,
      uploaderId: n.uploader_id,
      uploaderName: n.uploader?.name || 'Me',
      date: n.date,
      fileUrl: n.file_url,
      fileType: n.file_type as any,
      isApproved: n.is_approved,
      upvotes: upvotesData?.filter((u: any) => u.note_id === n.id).length || 0
    }));
  },

  addNote: async (note: Omit<Note, 'id' | 'date' | 'isApproved' | 'upvotes'> & { file?: File }): Promise<Note> => {
    if (!note.file) throw new Error("No file provided");

    // 1. Fetch User Profile to check Trust Points for Auto-Approval
    let isAutoApproved = false;
    let trustPoints = 0;

    try {
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('trust_points, role')
            .eq('id', note.uploaderId)
            .maybeSingle();
        
        if (userProfile) {
            trustPoints = userProfile.trust_points || 0;
            
            // LOGIC 1: Auto-approve if Admin/Owner OR if trust_points >= 5
            isAutoApproved = 
                userProfile.role === 'admin' || 
                userProfile.role === 'owner' || 
                trustPoints >= 5;
        }
    } catch (e) {
        console.warn("Profile check failed:", e);
    }

    // 2. Upload File to Storage
    // Sanitize filename
    const nameParts = note.file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const nameBase = nameParts.join('.');
    const cleanFileName = nameBase.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${Date.now()}_${cleanFileName}${ext ? '.' + ext : ''}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('course_materials')
        .upload(filePath, note.file);

    if (uploadError) throw new Error(uploadError.message);

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('course_materials')
        .getPublicUrl(filePath);

    // 4. Insert into Database
    const { data, error } = await supabase
        .from('notes')
        .insert([{
            title: note.title,
            description: note.description,
            major: note.major,
            category: note.category,
            uploader_id: note.uploaderId,
            file_url: publicUrl,
            file_type: note.fileType,
            is_approved: isAutoApproved 
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        ...data,
        uploaderName: note.uploaderName, // Optimistic
        upvotes: 0,
        date: data.date,
        id: data.id,
        isApproved: isAutoApproved,
        fileUrl: publicUrl
    } as Note;
  },

  approveNote: async (id: string): Promise<void> => {
    // 1. Fetch the note to get the uploader ID
    const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('uploader_id, is_approved')
        .eq('id', id)
        .single();
    
    if (noteError || !note) throw new Error("Note not found");
    if (note.is_approved) return; // Already approved

    // 2. Approve the note
    const { error: updateError } = await supabase
        .from('notes')
        .update({ is_approved: true })
        .eq('id', id);
    
    if (updateError) throw updateError;

    // 3. LOGIC 2: Increment student's trust_points by +1
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('trust_points')
            .eq('id', note.uploader_id)
            .single();
        
        if (profile) {
            await supabase.from('profiles').update({
                trust_points: (profile.trust_points || 0) + 1
            }).eq('id', note.uploader_id);
        }
    } catch (e) {
        console.warn("Failed to increment trust points:", e);
    }
  },

  rejectNote: async (id: string): Promise<void> => {
    await supabase.from('notes').delete().eq('id', id);
  },

  deleteNote: async (id: string): Promise<void> => {
    await supabase.from('notes').delete().eq('id', id);
  },

  toggleUpvote: async (id: string): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Check if upvoted
    const { data: existing } = await supabase
        .from('upvotes')
        .select('*')
        .eq('note_id', id)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        // Remove upvote
        await supabase.from('upvotes').delete().eq('id', existing.id);
    } else {
        // Add upvote
        await supabase.from('upvotes').insert([{ note_id: id, user_id: user.id }]);
    }

    // Return new count
    const { count } = await supabase
        .from('upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', id);
    
    return count || 0;
  },

  // --- REPORTING ---

  reportNote: async (noteId: string, userId: string, reason: string): Promise<void> => {
    const { error } = await supabase.from('reports').insert({
      note_id: noteId,
      reporter_id: userId,
      reason: reason
    });
    if (error) {
        console.error("Supabase Report Insert Error:", error);
        throw new Error(error.message || "Database insert failed");
    }
  },

  getReports: async (): Promise<Report[]> => {
      // Fetch raw reports without joins first to avoid FK errors
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
          console.error("Error fetching reports", error.message);
          return [];
      }

      if (!reports || reports.length === 0) return [];

      // Extract unique IDs for bulk fetching
      const reporterIds = [...new Set(reports.map((r: any) => r.reporter_id).filter(Boolean))];
      const noteIds = [...new Set(reports.map((r: any) => r.note_id).filter(Boolean))];

      // Fetch Profiles (Reporters)
      const { data: reporters } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', reporterIds);
      
      const reporterMap = new Map(reporters?.map((p: any) => [p.id, p.name]) || []);

      // Fetch Notes
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds);

      // Explicitly type the map to ensure values are treated as 'any' instead of 'unknown'
      const noteMap = new Map<string, any>(notes?.map((n: any) => [n.id, n]) || []);

      // Map everything together
      return reports.map((r: any) => {
          const noteData = noteMap.get(r.note_id);
          let noteObj: Note | undefined = undefined;
          
          if (noteData) {
               noteObj = {
                  id: noteData.id,
                  title: noteData.title,
                  description: noteData.description,
                  major: noteData.major,
                  category: noteData.category,
                  uploaderId: noteData.uploader_id,
                  uploaderName: 'Unknown', // Simplified for report context
                  date: noteData.date,
                  fileUrl: noteData.file_url,
                  fileType: noteData.file_type as any,
                  isApproved: noteData.is_approved,
                  upvotes: 0 
               };
          }

          return {
              id: r.id,
              noteId: r.note_id,
              noteTitle: noteData?.title || 'Deleted Note',
              reporterId: r.reporter_id,
              reporterName: reporterMap.get(r.reporter_id) || 'Unknown',
              reason: r.reason,
              date: r.created_at,
              note: noteObj
          };
      });
  },

  deleteReport: async (id: string): Promise<void> => {
      await supabase.from('reports').delete().eq('id', id);
  },

  // --- SUGGESTIONS ---

  addSuggestion: async (content: string, user?: User | null): Promise<void> => {
    try {
        const payload: any = { content };
        if (user) {
            payload.user_id = user.id;
        }
        
        const { error } = await supabase.from('suggestions').insert(payload);
        
        if (error) {
             throw new Error(error.message || "Failed to submit suggestion");
        }
    } catch (e: any) {
        throw e;
    }
  },

  getSuggestions: async (): Promise<Suggestion[]> => {
    try {
        const { data, error } = await supabase
            .from('suggestions')
            .select(`
                id,
                content,
                created_at,
                user:profiles!user_id (name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            // Silently handle missing table or permission issues
            if (error.code === '42P01') return [];
            console.error("Error fetching suggestions:", error.message);
            return [];
        }

        return (data || []).map((s: any) => ({
            id: s.id,
            content: s.content,
            date: s.created_at,
            userId: s.user_id,
            userName: s.user?.name || 'Anonymous'
        }));
    } catch (e: any) {
        return [];
    }
  },

  deleteSuggestion: async (id: string): Promise<void> => {
      await supabase.from('suggestions').delete().eq('id', id);
  },

  // --- STATS ---
  
  getUserCount: async (): Promise<number> => {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (error) return 0;
        return count || 0;
    } catch (e) {
        return 0;
    }
  },

  // --- AI ---

  generateAiContent: async (
    noteId: string, 
    taskType: 'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN',
    userQuery?: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<string> => {
    // 1. Get note details for URL
    const { data: note } = await supabase.from('notes').select('file_url, file_type').eq('id', noteId).single();
    if (!note) return "Error: Note not found.";

    // API Key must be accessed directly via process.env.API_KEY
    if (!process.env.API_KEY) {
      console.error("Gemini API Error: API_KEY environment variable is missing.");
      return "AI Service is unavailable. Please check the API configuration.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fetch the file from Supabase Storage Public URL
      const fileResponse = await fetch(note.file_url);
      if (!fileResponse.ok) throw new Error("Failed to fetch file from storage.");
      
      const blob = await fileResponse.blob();
      
      // Construct Task Specific Instructions
      let taskInstructions = '';
      switch(taskType) {
        case 'SUMMARY':
          taskInstructions = `
            Task: SUMMARY
            - Read the entire text or file.
            - Extract the top 5-7 key ideas.
            - Present the summary in clear bullet points.
            - Use academic yet accessible language.
            - Conclude with a "Golden Tip" for mastering this topic.`;
          break;
        case 'QUIZ':
          taskInstructions = `
            Task: QUIZ
            - Generate 5 Multiple Choice Questions (MCQ) based on the text.
            - Output must be a pure JSON Array. Do NOT wrap in markdown code blocks.
            - Each object must have:
              - "question": string
              - "options": array of 4 strings
              - "correctAnswer": number (index 0-3)
              - "explanation": string (why the answer is correct)
            `;
          break;
        case 'ROADMAP':
          taskInstructions = `
            Task: ROADMAP
            - The user wants to learn the topic in the text from scratch.
            - Break the topic down into a structured study plan (divided by weeks or days).
            - Order topics from easiest to hardest.
            - Suggest specific YouTube search titles for each section.`;
          break;
        case 'TAGS':
          taskInstructions = `
            Task: TAGS
            - Extract the top 5 keywords that describe the file to facilitate future searching.
            - Separate keywords with commas only. Do not add any other text (e.g., "Tags:").`;
          break;
        case 'EXPLAIN':
          // Enhanced logic to handle greetings vs actual questions
          taskInstructions = `
            Task: CONVERSATIONAL AGENT / TUTOR
            - You have access to the file provided by the student.
            - User's Input: "${userQuery}"

            **LOGIC FLOW:**
            1. **Is the input a Greeting?** (e.g., "Hi", "Hello", "Salam", "Hey", "How are you?"):
               - **ACTION:** Reply naturally and politely. 
               - **CONSTRAINT:** Do NOT summarize the document yet. Keep it brief.

            2. **Is the input a Specific Question?**:
               - **ACTION:** Answer the question using evidence *strictly* from the document.
               - **TONE:** Act like a patient university professor. Use examples if helpful.

            3. **Is the input generic (e.g., "Explain", "Analyze")?**:
               - **ACTION:** Provide a high-level summary/explanation of the document's core concepts.
          `;
          break;
      }

      // Persona and General Rules
      const systemPrompt = `
      You are "UniShare AI," an intelligent academic assistant for university students on the UniShare platform. 
      Your mission is to assist students with their studies based on the content they provide.
      
      General Rules:
      - **Language:** The output MUST be in **${language === 'ar' ? 'Modern Standard Arabic' : 'English'}**.
      - **Formatting:** Use Markdown (Headings with ##, Bold with **) to ensure the text is easily readable on the app.
      `;

      // MIME Type handling
      const mimeType = blob.type || (note.file_type === 'pdf' ? 'application/pdf' : 
                                     note.file_type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                                     'image/jpeg');

      let parts: any[] = [{ text: taskInstructions }];

      // HANDLE DOCX (Convert to text)
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || note.file_type === 'docx') {
          try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              const textContent = result.value;
              parts.push({ text: `DOCUMENT CONTENT:\n${textContent}` });
          } catch (err) {
              console.error("Mammoth extraction error:", err);
              return "Error: Could not extract text from this Word document.";
          }
      } 
      // HANDLE PDF / IMAGE (Inline data)
      else {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          });
          
          parts.push({
              inlineData: {
                  mimeType: mimeType,
                  data: base64Data
              }
          });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: taskType === 'QUIZ' ? 'application/json' : 'text/plain'
        }
      });

      return response.text || "Could not analyze the document content. The model returned no text.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Provide more specific error messages to the user if possible
      if (error.message?.includes('403') || error.message?.includes('API key')) {
          return "Error: Invalid API Key or Access Denied. Please check your API configuration.";
      }
      if (error.message?.includes('400')) {
          return "Error: Unsupported file format or invalid request for this AI model.";
      }
      
      return "An error occurred while analyzing the file. Please ensure the file is accessible and supported.";
    }
  },

  // --- COMMENTS ---

  getComments: async (noteId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            *,
            commenter:profiles!user_id (name, avatar_url)
        `)
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((c: any) => ({
        id: c.id,
        noteId: c.note_id,
        userId: c.user_id,
        userName: c.commenter?.name || 'User',
        userAvatar: c.commenter?.avatar_url || '',
        text: c.text,
        date: c.created_at
    }));
  },

  addComment: async (noteId: string, text: string, user: User): Promise<Comment> => {
    const { data, error } = await supabase
        .from('comments')
        .insert([{
            note_id: noteId,
            user_id: user.id,
            text: text
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        noteId: data.note_id,
        userId: data.user_id,
        userName: user.name,
        userAvatar: user.avatar,
        text: data.text,
        date: data.created_at
    };
  }
};
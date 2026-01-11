import { Note, Comment, User, Report } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient';

// Effectively this is now the 'apiService'.
export const mockDb = {
  
  // --- NOTES ---

  getNotes: async (): Promise<Note[]> => {
    // Join with profiles to get uploader name
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        uploader:profiles!uploader_id (name)
      `)
      .order('date', { ascending: false });

    if (error) {
        console.error("Error fetching notes:", error);
        return [];
    }

    // Also fetch upvotes to display accurate counts
    const { data: upvotesData } = await supabase.from('upvotes').select('note_id');

    return data.map((n: any) => ({
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
  },

  getMyNotes: async (userId: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select(`*, uploader:profiles!uploader_id (name)`)
      .eq('uploader_id', userId);

    if (error) return [];
    
    const { data: upvotesData } = await supabase.from('upvotes').select('note_id');

    return data.map((n: any) => ({
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

    // 1. Upload File to Storage
    // Sanitize filename to prevent issues with special characters in URLs
    const nameParts = note.file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const nameBase = nameParts.join('.');
    // Only allow alphanumeric, underscores and hyphens
    const cleanFileName = nameBase.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${Date.now()}_${cleanFileName}${ext ? '.' + ext : ''}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('course_materials')
        .upload(filePath, note.file);

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('course_materials')
        .getPublicUrl(filePath);

    // 3. Insert into Database
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
            is_approved: false // Default
        }])
        .select()
        .single();

    if (error) throw error;

    return {
        ...data,
        uploaderName: note.uploaderName, // Optimistic
        upvotes: 0,
        date: data.date,
        id: data.id,
        isApproved: false,
        fileUrl: publicUrl
    } as Note;
  },

  approveNote: async (id: string): Promise<void> => {
    await supabase.from('notes').update({ is_approved: true }).eq('id', id);
  },

  rejectNote: async (id: string): Promise<void> => {
    // For now, rejection deletes the note. In a real app, might want a 'rejected' status.
    // Also delete the file from storage if you want to save space, but keeping it simple here.
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
        // Log the full error object for debugging (Supabase error objects don't always stringify well in Alerts)
        console.error("Supabase Report Insert Error:", JSON.stringify(error, null, 2));
        // Throw a new Error with the message so it can be caught and displayed properly in the UI
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
          console.error("Error fetching reports", error);
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
      return "AI Service is unavailable (API Key missing). Please configure the API Key.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fetch the file from Supabase Storage Public URL
      const fileResponse = await fetch(note.file_url);
      if (!fileResponse.ok) throw new Error("Failed to fetch file");
      
      const blob = await fileResponse.blob();
      
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });

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
      
      ${taskInstructions}

      General Rules:
      - **Language:** The output MUST be in **${language === 'ar' ? 'Modern Standard Arabic' : 'English'}**.
      - **Formatting:** Use Markdown (Headings with ##, Bold with **) to ensure the text is easily readable on the app.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: blob.type || (note.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                data: base64Data
              }
            }
          ]
        },
        config: taskType === 'QUIZ' ? {
            responseMimeType: 'application/json'
        } : undefined
      });

      return response.text || "Could not analyze the document content.";
    } catch (error) {
      console.error("Gemini API Error:", error);
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

    return data.map((c: any) => ({
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

    if (error) throw error;

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
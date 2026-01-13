
import { Note, Comment, User, Report, Suggestion, UserRole } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase, isSupabaseConfigured } from './supabaseClient';
import mammoth from 'mammoth';

// MOCK DATA STORAGE HELPERS
const getLocal = (key: string) => {
    try {
        return JSON.parse(localStorage.getItem(`mock_db_${key}`) || '[]');
    } catch { return []; }
};
const setLocal = (key: string, data: any) => localStorage.setItem(`mock_db_${key}`, JSON.stringify(data));

// Effectively this is now the 'apiService'.
export const mockDb = {
  
  // --- USER PROFILE ---

  updateUserProfile: async (
    userId: string, 
    email: string, 
    updates: { name: string, oldPassword?: string, newPassword?: string, file?: File | null }
  ): Promise<void> => {
    
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const currentUser = JSON.parse(localStorage.getItem('unishare_mock_user') || '{}');
        const updatedUser = { ...currentUser, name: updates.name };
        if (updates.file) {
            // Mock file upload by creating a fake URL
            updatedUser.avatar = URL.createObjectURL(updates.file);
        }
        localStorage.setItem('unishare_mock_user', JSON.stringify(updatedUser));
        
        // Also update in users list if it exists
        const users = getLocal('users');
        const userIndex = users.findIndex((u: User) => u.id === userId);
        if (userIndex >= 0) {
            users[userIndex] = { ...users[userIndex], name: updates.name, avatar: updatedUser.avatar };
            setLocal('users', users);
        }
        return;
    }

    // 1. Password Update Logic
    if (updates.newPassword && updates.newPassword.trim() !== "") {
        if (!updates.oldPassword) {
            throw new Error("Old password is required to set a new password.");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: updates.oldPassword
        });

        if (signInError) {
            throw new Error("Incorrect old password.");
        }

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
        
        const { error: uploadError } = await supabase.storage
            .from('course_materials')
            .upload(fileName, updates.file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
            .from('course_materials')
            .getPublicUrl(fileName);
            
        avatarUrl = publicUrl;
    }

    // 3. Profile Table Update
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
    
    // 4. Update Auth Metadata
    await supabase.auth.updateUser({
        data: {
            name: updates.name,
            avatar_url: avatarUrl 
        }
    });
  },

  // --- ADMIN USER MANAGEMENT ---

  getUsers: async (): Promise<User[]> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        let users = getLocal('users');
        if (!users || users.length === 0) {
            users = [
                { id: '1', name: 'Admin User', role: 'admin', avatar: '', joinedAt: new Date().toISOString(), trustPoints: 100 },
                { id: '2', name: 'Student One', role: 'student', avatar: '', joinedAt: new Date().toISOString(), trustPoints: 20 },
                { id: '3', name: 'Student Two', role: 'student', avatar: '', joinedAt: new Date().toISOString(), trustPoints: 55 }
            ];
            setLocal('users', users);
        }
        return users;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        avatar: p.avatar_url,
        joinedAt: p.created_at,
        trustPoints: p.trust_points || 0
    }));
  },

  updateUserRole: async (targetUserId: string, newRole: UserRole): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const users = getLocal('users');
        const updated = users.map((u: User) => u.id === targetUserId ? { ...u, role: newRole } : u);
        setLocal('users', updated);
        
        // If updating self in mock mode, update session user
        const currentUser = JSON.parse(localStorage.getItem('unishare_mock_user') || '{}');
        if (currentUser.id === targetUserId) {
            currentUser.role = newRole;
            localStorage.setItem('unishare_mock_user', JSON.stringify(currentUser));
        }
        return;
    }

    const { error } = await supabase.rpc('update_user_role', {
        target_user_id: targetUserId,
        new_role: newRole
    });

    if (error) throw new Error(error.message);
  },

  // --- NOTES ---

  getNotes: async (): Promise<Note[]> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        return getLocal('notes');
    }

    try {
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
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        return notes.filter((n: Note) => n.uploaderId === userId);
    }

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

    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const newNote: Note = {
            id: Math.random().toString(36).substr(2, 9),
            title: note.title,
            description: note.description,
            major: note.major,
            category: note.category,
            uploaderId: note.uploaderId,
            uploaderName: note.uploaderName,
            date: new Date().toISOString(),
            fileUrl: URL.createObjectURL(note.file), // Blob URL for session
            fileType: note.fileType,
            isApproved: true, // Auto-approve in mock
            upvotes: 0
        };
        const notes = getLocal('notes');
        setLocal('notes', [newNote, ...notes]);
        return newNote;
    }

    // 1. Fetch User Profile to check Trust Points
    let isAutoApproved = false;
    let trustPoints = 0;

    try {
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('trust_points, role')
            .eq('id', note.uploaderId)
            .maybeSingle();
        
        if (userProfile) {
            trustPoints = userProfile.trust_points || 0;
            isAutoApproved = 
                userProfile.role === 'admin' || 
                userProfile.role === 'owner' || 
                trustPoints >= 80;
        }
    } catch (e) {
        console.warn("Profile check failed:", e);
    }

    // 2. Upload File
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
        uploaderName: note.uploaderName,
        upvotes: 0,
        date: data.date,
        id: data.id,
        isApproved: data.is_approved,
        fileUrl: publicUrl
    } as Note;
  },

  approveNote: async (id: string): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        const updated = notes.map((n: Note) => n.id === id ? { ...n, isApproved: true } : n);
        setLocal('notes', updated);
        return;
    }

    // 1. Fetch note to get uploader
    const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('uploader_id, is_approved')
        .eq('id', id)
        .single();
    
    if (noteError || !note) throw new Error("Note not found");
    if (note.is_approved) return; 

    // 2. Approve note
    const { error: updateError } = await supabase
        .from('notes')
        .update({ is_approved: true })
        .eq('id', id);
    
    if (updateError) throw updateError;

    // 3. Reward Trust Points
    try {
        await supabase.rpc('update_user_trust', {
            target_user_id: note.uploader_id,
            points_change: 5 
        });
    } catch (e) {
        console.warn("Failed to increment trust points:", e);
    }
  },

  rejectNote: async (id: string): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        const updated = notes.filter((n: Note) => n.id !== id);
        setLocal('notes', updated);
        return;
    }

    const { data: note } = await supabase.from('notes').select('uploader_id').eq('id', id).single();
    
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;

    if (note?.uploader_id) {
        try {
            await supabase.rpc('update_user_trust', {
                target_user_id: note.uploader_id,
                points_change: -5
            });
        } catch(e) { console.warn("Trust update failed", e); }
    }
  },

  deleteNote: async (id: string): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        const updated = notes.filter((n: Note) => n.id !== id);
        setLocal('notes', updated);
        return;
    }

    await supabase.from('notes').delete().eq('id', id);
  },

  toggleUpvote: async (id: string): Promise<number> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        const note = notes.find((n: Note) => n.id === id);
        if (note) {
            // Simple toggle simulation
            note.upvotes = (note.upvotes || 0) + 1;
            setLocal('notes', notes);
            return note.upvotes;
        }
        return 0;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: existing } = await supabase
        .from('upvotes')
        .select('*')
        .eq('note_id', id)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        await supabase.from('upvotes').delete().eq('id', existing.id);
    } else {
        await supabase.from('upvotes').insert([{ note_id: id, user_id: user.id }]);
    }

    const { count } = await supabase
        .from('upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', id);
    
    return count || 0;
  },

  // --- REPORTING ---

  reportNote: async (noteId: string, userId: string, reason: string): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const reports = getLocal('reports');
        reports.push({
            id: Math.random().toString(),
            noteId,
            reporterId: userId,
            reason,
            created_at: new Date().toISOString()
        });
        setLocal('reports', reports);
        return;
    }

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
      // MOCK FALLBACK
      if (!isSupabaseConfigured) {
          const rawReports = getLocal('reports');
          // Need to hydrate note/reporter details in mock, simplified here:
          return rawReports.map((r: any) => ({
              id: r.id,
              noteId: r.noteId,
              noteTitle: 'Mock Note',
              reporterId: r.reporterId,
              reporterName: 'Mock User',
              reason: r.reason,
              date: r.created_at || new Date().toISOString()
          }));
      }

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return [];
      if (!reports || reports.length === 0) return [];

      const reporterIds = [...new Set(reports.map((r: any) => r.reporter_id).filter(Boolean))];
      const noteIds = [...new Set(reports.map((r: any) => r.note_id).filter(Boolean))];

      const { data: reporters } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', reporterIds);
      
      const reporterMap = new Map(reporters?.map((p: any) => [p.id, p.name]) || []);

      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds);

      const noteMap = new Map<string, any>(notes?.map((n: any) => [n.id, n]) || []);

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
                  uploaderName: 'Unknown',
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
      // MOCK FALLBACK
      if (!isSupabaseConfigured) {
          const reports = getLocal('reports');
          setLocal('reports', reports.filter((r: any) => r.id !== id));
          return;
      }
      await supabase.from('reports').delete().eq('id', id);
  },

  // --- SUGGESTIONS ---

  addSuggestion: async (content: string, user?: User | null): Promise<void> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const suggestions = getLocal('suggestions');
        suggestions.push({
            id: Math.random().toString(),
            content,
            user_id: user?.id,
            user_name: user?.name,
            created_at: new Date().toISOString()
        });
        setLocal('suggestions', suggestions);
        return;
    }

    try {
        const payload: any = { content };
        if (user) payload.user_id = user.id;
        
        const { error } = await supabase.from('suggestions').insert(payload);
        if (error) throw new Error(error.message);
    } catch (e: any) { throw e; }
  },

  getSuggestions: async (): Promise<Suggestion[]> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const suggestions = getLocal('suggestions');
        return suggestions.map((s: any) => ({
            id: s.id,
            content: s.content,
            date: s.created_at,
            userId: s.user_id,
            userName: s.user_name || 'Anonymous'
        }));
    }

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
            if (error.code === '42P01') return [];
            return [];
        }

        return (data || []).map((s: any) => ({
            id: s.id,
            content: s.content,
            date: s.created_at,
            userId: s.user_id,
            userName: s.user?.name || 'Anonymous'
        }));
    } catch (e: any) { return []; }
  },

  deleteSuggestion: async (id: string): Promise<void> => {
      // MOCK FALLBACK
      if (!isSupabaseConfigured) {
          const suggestions = getLocal('suggestions');
          setLocal('suggestions', suggestions.filter((s: any) => s.id !== id));
          return;
      }
      await supabase.from('suggestions').delete().eq('id', id);
  },

  // --- STATS ---
  
  getUserCount: async (): Promise<number> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        return 1542; // Fake stat
    }

    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (error) return 0;
        return count || 0;
    } catch (e) { return 0; }
  },

  // --- AI ---

  generateAiContent: async (
    noteId: string, 
    taskType: 'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN',
    userQuery?: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<string> => {
    // In Mock Mode, we can't fetch file URLs from DB, so we look in local storage
    let fileUrl = '';
    let fileType = '';

    if (!isSupabaseConfigured) {
        const notes = getLocal('notes');
        const n = notes.find((x: Note) => x.id === noteId);
        if (!n) return "Note not found locally.";
        fileUrl = n.fileUrl;
        fileType = n.fileType;
    } else {
        const { data: note } = await supabase.from('notes').select('file_url, file_type').eq('id', noteId).single();
        if (!note) return "Error: Note not found.";
        fileUrl = note.file_url;
        fileType = note.file_type;
    }

    if (!process.env.API_KEY) {
      return "AI Service Unavailable (Missing API_KEY). Please add it to your environment variables.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) throw new Error("Failed to fetch file.");
      
      const blob = await fileResponse.blob();
      
      let taskInstructions = '';
      switch(taskType) {
        case 'SUMMARY':
          taskInstructions = `Task: SUMMARY. Extract top 5 key ideas.`;
          break;
        case 'QUIZ':
          taskInstructions = `Task: QUIZ. Generate 5 MCQ. Output JSON Array only.`;
          break;
        case 'ROADMAP':
          taskInstructions = `Task: ROADMAP. Create study plan.`;
          break;
        case 'TAGS':
          taskInstructions = `Task: TAGS. Extract 5 comma-separated keywords.`;
          break;
        case 'EXPLAIN':
          taskInstructions = `Task: TUTOR. User Input: "${userQuery}". Answer based on document.`;
          break;
      }

      const systemPrompt = `You are UniShare AI. Output in ${language === 'ar' ? 'Arabic' : 'English'}. Use Markdown.`;
      
      const mimeType = blob.type || (fileType === 'pdf' ? 'application/pdf' : 
                                     fileType === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                                     'image/jpeg');

      let parts: any[] = [{ text: taskInstructions }];

      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'docx') {
          try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              parts.push({ text: `DOCUMENT CONTENT:\n${result.value}` });
          } catch (err) {
              return "Error: Could not extract text from DOCX.";
          }
      } else {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          });
          parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: taskType === 'QUIZ' ? 'application/json' : 'text/plain'
        }
      });

      return response.text || "No response from AI.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return "AI Error: " + (error.message || "Unknown error");
    }
  },

  // --- COMMENTS ---

  getComments: async (noteId: string): Promise<Comment[]> => {
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const comments = getLocal('comments');
        return comments.filter((c: Comment) => c.noteId === noteId);
    }

    const { data, error } = await supabase
        .from('comments')
        .select(`*, commenter:profiles!user_id (name, avatar_url)`)
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
    // MOCK FALLBACK
    if (!isSupabaseConfigured) {
        const newComment: Comment = {
            id: Math.random().toString(),
            noteId,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            text,
            date: new Date().toISOString()
        };
        const comments = getLocal('comments');
        setLocal('comments', [newComment, ...comments]);
        return newComment;
    }

    const { data, error } = await supabase
        .from('comments')
        .insert([{ note_id: noteId, user_id: user.id, text: text }])
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

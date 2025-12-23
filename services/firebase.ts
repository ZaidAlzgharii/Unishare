import { Note, Comment, User } from '../types';
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
    // Sanitize filename to prevent issues
    const fileExt = note.file.name.split('.').pop();
    const cleanFileName = note.file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanFileName}.${fileExt}`;
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
    if (error) throw error;
  },

  // --- AI ---

  generateAiSummary: async (noteId: string): Promise<string> => {
    // 1. Get note details for URL
    const { data: note } = await supabase.from('notes').select('file_url, file_type').eq('id', noteId).single();
    if (!note) return "Error: Note not found.";

    // API Key must be accessed directly via process.env.API_KEY
    if (!process.env.API_KEY) {
      return "AI Summary is unavailable (API Key missing). Please configure the API Key.";
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

      const prompt = `Act as an expert academic analyst. Analyze the ATTACHED FILE and provide a professional, bilingual summary (ENGLISH and ARABIC).
      
      Structure:
      1. **Core Concept / الفكرة الأساسية**
      2. **Key Insights / أبرز النقاط** (Bulleted)
      3. **Important Terminology / المصطلحات الهامة**

      Keep it strictly based on the file content.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: blob.type || (note.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                data: base64Data
              }
            }
          ]
        },
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
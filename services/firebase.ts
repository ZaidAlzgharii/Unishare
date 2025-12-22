import { Note, Comment, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type DbNote = {
  id: string;
  title: string;
  description: string;
  major: string;
  category: string;
  uploader_id: string;
  uploader_name: string;
  file_url: string;
  file_type: string;
  is_approved: boolean;
  upvotes: number;
  created_at: string;
};

type DbComment = {
  id: string;
  note_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at: string;
};

const mapDbNoteToNote = (dbNote: DbNote): Note => ({
  id: dbNote.id,
  title: dbNote.title,
  description: dbNote.description,
  major: dbNote.major,
  category: dbNote.category,
  uploaderId: dbNote.uploader_id,
  uploaderName: dbNote.uploader_name,
  fileUrl: dbNote.file_url,
  fileType: dbNote.file_type as any,
  isApproved: dbNote.is_approved,
  upvotes: dbNote.upvotes,
  date: dbNote.created_at
});

const mapDbCommentToComment = (dbComment: DbComment): Comment => ({
  id: dbComment.id,
  noteId: dbComment.note_id,
  userId: dbComment.user_id,
  userName: dbComment.user_name,
  userAvatar: dbComment.user_avatar,
  text: dbComment.text,
  date: dbComment.created_at
});

export const mockDb = {
  getNotes: async (): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return (data || []).map(mapDbNoteToNote);
  },

  getMyNotes: async (userId: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user notes:', error);
      return [];
    }

    return (data || []).map(mapDbNoteToNote);
  },

  addNote: async (note: Omit<Note, 'id' | 'date' | 'isApproved' | 'upvotes'>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: note.title,
        description: note.description,
        major: note.major,
        category: note.category,
        uploader_id: note.uploaderId,
        uploader_name: note.uploaderName,
        file_url: note.fileUrl,
        file_type: note.fileType,
        is_approved: false,
        upvotes: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      throw new Error('Failed to upload note');
    }

    return mapDbNoteToNote(data);
  },

  approveNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) {
      console.error('Error approving note:', error);
      throw new Error('Failed to approve note');
    }
  },

  rejectNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error rejecting note:', error);
      throw new Error('Failed to reject note');
    }
  },

  deleteNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  },

  toggleUpvote: async (id: string): Promise<number> => {
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching note for upvote:', fetchError);
      return 0;
    }

    const newUpvotes = (note?.upvotes || 0) + 1;

    const { error: updateError } = await supabase
      .from('notes')
      .update({ upvotes: newUpvotes })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating upvotes:', updateError);
      return note?.upvotes || 0;
    }

    return newUpvotes;
  },

  generateAiSummary: async (noteId: string): Promise<string> => {
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error || !note) {
      return "Error: Note not found.";
    }

    const mappedNote = mapDbNoteToNote(note);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const fileResponse = await fetch(mappedNote.fileUrl);
      const blob = await fileResponse.blob();

      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });

      const prompt = `Act as an expert academic analyst. Analyze the ATTACHED FILE (image or PDF) and provide a professional, bilingual summary in both ENGLISH and ARABIC.

      CRITICAL: Summarize only the specific text and data found INSIDE THIS FILE. Do not provide general information about the subject.

      Structure the response as follows (Repeat each section in both languages):

      1. **Core Concept / الفكرة الأساسية**
         - (One paragraph in English)
         - (One paragraph in Arabic)

      2. **Key Insights / أبرز النقاط**
         - (List 5 key points in English)
         - (List 5 key points in Arabic)

      3. **Important Terminology / المصطلحات الهامة**
         - (List specific terms/formulas found in the file with bilingual translations/explanations)

      Keep the tone academic, encouraging, and helpful for students. Ensure the transition between languages is clear.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: blob.type || (mappedNote.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                data: base64Data
              }
            }
          ]
        },
      });

      return response.text || "Could not analyze the document content.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "An error occurred while analyzing the file. Please ensure the file is valid and try again.";
    }
  },

  getComments: async (noteId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []).map(mapDbCommentToComment);
  },

  addComment: async (noteId: string, text: string, user: User): Promise<Comment> => {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        note_id: noteId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        text
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }

    return mapDbCommentToComment(data);
  }
};

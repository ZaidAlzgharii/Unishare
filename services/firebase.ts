import { Note, Comment, User } from '../types';
import { MOCK_NOTES } from '../constants';
import { GoogleGenAI } from "@google/genai";

// In-memory store to simulate database persistence during session
let memoryNotes: Note[] = [...MOCK_NOTES];
let memoryComments: Comment[] = [];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockDb = {
  getNotes: async (): Promise<Note[]> => {
    await delay(800); // Simulate network latency
    return [...memoryNotes];
  },

  getMyNotes: async (userId: string): Promise<Note[]> => {
    await delay(600);
    return memoryNotes.filter(n => n.uploaderId === userId || (userId === 'std_1' && n.uploaderId === 'std_1')); 
  },

  addNote: async (note: Omit<Note, 'id' | 'date' | 'isApproved' | 'upvotes'>): Promise<Note> => {
    await delay(1200); // Simulate upload time
    const newNote: Note = {
      ...note,
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      isApproved: false, // Default to pending
      upvotes: 0,
    };
    memoryNotes = [newNote, ...memoryNotes];
    return newNote;
  },

  approveNote: async (id: string): Promise<void> => {
    await delay(500);
    memoryNotes = memoryNotes.map((n) => (n.id === id ? { ...n, isApproved: true } : n));
  },

  rejectNote: async (id: string): Promise<void> => {
    await delay(500);
    memoryNotes = memoryNotes.filter((n) => n.id !== id);
  },

  deleteNote: async (id: string): Promise<void> => {
    await delay(600);
    memoryNotes = memoryNotes.filter((n) => n.id !== id);
  },

  toggleUpvote: async (id: string): Promise<number> => {
    await delay(300);
    let newCount = 0;
    memoryNotes = memoryNotes.map((n) => {
      if (n.id === id) {
        newCount = n.upvotes + 1;
        return { ...n, upvotes: n.upvotes + 1 };
      }
      return n;
    });
    return newCount;
  },

  generateAiSummary: async (noteId: string): Promise<string> => {
    const note = memoryNotes.find(n => n.id === noteId);
    if (!note) return "Error: Note not found.";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fetch the actual file content
      const fileResponse = await fetch(note.fileUrl);
      const blob = await fileResponse.blob();
      
      // Convert blob to base64
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
                mimeType: blob.type || (note.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
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

  // Comments
  getComments: async (noteId: string): Promise<Comment[]> => {
    await delay(400);
    return memoryComments.filter(c => c.noteId === noteId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addComment: async (noteId: string, text: string, user: User): Promise<Comment> => {
    await delay(400);
    const newComment: Comment = {
      id: Math.random().toString(36).substring(7),
      noteId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text,
      date: new Date().toISOString()
    };
    memoryComments = [newComment, ...memoryComments];
    return newComment;
  }
};
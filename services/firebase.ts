import { Note, Comment, User } from '../types';
import { MOCK_NOTES } from '../constants';

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
    // ^ Mock logic: ensuring demo user sees data even if IDs mismatch in early mock
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
    await delay(2500); // Simulate AI processing time
    const note = memoryNotes.find(n => n.id === noteId);
    if (!note) return "Could not generate summary.";
    
    return `Here are the key takeaways from "${note.title}":\n\n1. **Core Concept**: The document focuses heavily on ${note.category} principles within the ${note.program} field.\n2. **Key Definitions**: Defines critical terms relevant to ${note.course}.\n3. **Analysis**: Provides a comparative study that highlights recent trends.\n4. **Conclusion**: Summarizes that foundational knowledge is key for advanced application.`;
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

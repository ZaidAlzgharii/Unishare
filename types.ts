export type UserRole = 'student' | 'admin' | 'owner';
// TrustLevel removed as we are using a simple integer counter now per your request

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  joinedAt?: string; // ISO String for registration date
  trustPoints: number; // Simple counter: <5 = Pending, >=5 = Auto-Approved
}

export type NoteType = 'pdf' | 'image' | 'docx' | 'other';

export interface Note {
  id: string;
  title: string;
  description: string;
  major: string;
  category: string;
  uploaderId: string;
  uploaderName: string;
  date: string; // ISO String
  fileUrl: string;
  fileType: NoteType;
  isApproved: boolean;
  upvotes: number;
}

export interface Comment {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  date: string;
}

export interface Report {
  id: string;
  noteId: string;
  noteTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  date: string;
  note?: Note; // Optional full note object for preview
}

export interface Suggestion {
  id: string;
  userId?: string;
  userName?: string;
  content: string;
  date: string;
}

export interface Program {
  name: string;
  courses?: string[]; // Made optional as courses are being phased out
}

export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}
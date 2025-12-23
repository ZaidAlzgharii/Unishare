export type UserRole = 'student' | 'admin' | 'owner';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  joinedAt?: string; // ISO String for registration date
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
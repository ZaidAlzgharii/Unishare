
export type UserRole = 'student' | 'admin' | 'owner';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export type NoteType = 'pdf' | 'image' | 'docx' | 'other';

export interface Note {
  id: string;
  title: string;
  description: string;
  program: string;
  course: string;
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
  courses: string[];
}

export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}

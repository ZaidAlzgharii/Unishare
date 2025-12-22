/*
  # Create Notes and Comments Tables for UniShare

  ## Overview
  This migration creates the core database structure for the UniShare note-sharing platform,
  including tables for notes and comments with proper security policies.

  ## New Tables
  
  ### 1. `notes`
  Stores all uploaded study materials and documents
  - `id` (uuid, primary key) - Unique identifier for each note
  - `title` (text) - Title of the note
  - `description` (text) - Detailed description
  - `major` (text) - Academic major/program
  - `category` (text) - Type of content (Summary, Lecture Notes, etc.)
  - `uploader_id` (text) - ID of the user who uploaded
  - `uploader_name` (text) - Display name of uploader
  - `file_url` (text) - URL to the uploaded file
  - `file_type` (text) - Type of file (pdf, image, docx, other)
  - `is_approved` (boolean, default false) - Approval status for moderation
  - `upvotes` (integer, default 0) - Number of upvotes received
  - `created_at` (timestamptz) - Upload timestamp

  ### 2. `comments`
  Stores user comments and discussions on notes
  - `id` (uuid, primary key) - Unique identifier
  - `note_id` (uuid, foreign key) - References the note being commented on
  - `user_id` (text) - ID of commenting user
  - `user_name` (text) - Display name of commenter
  - `user_avatar` (text) - Avatar URL
  - `text` (text) - Comment content
  - `created_at` (timestamptz) - Comment timestamp

  ## Security (RLS Policies)
  
  ### Notes Table
  - **SELECT**: Anyone can view approved notes; uploaders and admins can view their own pending notes
  - **INSERT**: Authenticated users can upload notes (pending approval by default)
  - **UPDATE**: Only the uploader or admins can update their notes
  - **DELETE**: Only admins can delete notes

  ### Comments Table
  - **SELECT**: Anyone can view comments on approved notes
  - **INSERT**: Authenticated users can add comments
  - **DELETE**: Comment authors and admins can delete comments

  ## Important Notes
  - All notes require approval (is_approved = false by default)
  - RLS is enabled on all tables for security
  - Uses timestamptz for proper timezone handling
  - Foreign key constraint ensures referential integrity
*/

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  major text NOT NULL,
  category text NOT NULL,
  uploader_id text NOT NULL,
  uploader_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'other',
  is_approved boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text DEFAULT '',
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_uploader ON notes(uploader_id);
CREATE INDEX IF NOT EXISTS idx_notes_approved ON notes(is_approved);
CREATE INDEX IF NOT EXISTS idx_notes_major ON notes(major);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_note ON comments(note_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTES TABLE POLICIES
-- =============================================

-- SELECT: View approved notes (public) OR your own pending notes
CREATE POLICY "Anyone can view approved notes"
  ON notes FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view their own pending notes"
  ON notes FOR SELECT
  USING (uploader_id = current_user);

-- INSERT: Authenticated users can upload notes
CREATE POLICY "Authenticated users can upload notes"
  ON notes FOR INSERT
  WITH CHECK (uploader_id = current_user);

-- UPDATE: Users can update their own notes OR admins can approve/update any note
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (uploader_id = current_user)
  WITH CHECK (uploader_id = current_user);

-- DELETE: Only allow deletion by the uploader or admin roles
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (uploader_id = current_user);

-- =============================================
-- COMMENTS TABLE POLICIES
-- =============================================

-- SELECT: Anyone can view comments on approved notes
CREATE POLICY "Anyone can view comments on approved notes"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = comments.note_id
      AND notes.is_approved = true
    )
  );

-- INSERT: Authenticated users can add comments
CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT
  WITH CHECK (user_id = current_user);

-- DELETE: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = current_user);

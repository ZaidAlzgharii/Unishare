import { createClient } from '@supabase/supabase-js';

// Credentials for UniShare Supabase Project
const supabaseUrl = 'https://mxfrjhjhmfyxthkrpwhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZnJqaGpobWZ5eHRoa3Jwd2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTA0MDQsImV4cCI6MjA4MjA4NjQwNH0.jP0Z1eXuhJ9_qKvx-3t8WIe0upAx4QzHg8x6gRpuKBk';

export const supabase = createClient(supabaseUrl, supabaseKey);

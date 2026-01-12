import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or use empty strings
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Logic to determine if Supabase is properly configured
// We check if the URL is present and NOT the placeholder value
export const isSupabaseConfigured = 
    supabaseUrl.length > 0 && 
    supabaseKey.length > 0 &&
    !supabaseUrl.includes('iusuzhplilrabrsduljs'); // Filter out the placeholder if it was hardcoded

// Create the client with valid credentials or dummy ones to prevent crash on init
// Real requests will be blocked by the 'isSupabaseConfigured' check in services
export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
    isSupabaseConfigured ? supabaseKey : 'placeholder-key'
);
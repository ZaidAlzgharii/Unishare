import { createClient } from '@supabase/supabase-js';

// CONFIGURATION: Connected to Project "mteccwfuueovbmeiovsa"
const supabaseUrl = process.env.SUPABASE_URL || 'https://mteccwfuueovbmeiovsa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_eNtLFSZP_gEldH2lUg9O8w_6KH25Q7z';

// Logic to determine if Supabase is properly configured
export const isSupabaseConfigured = 
    supabaseUrl.length > 0 && 
    supabaseKey.length > 0 &&
    !supabaseUrl.includes('placeholder');

// Create the client
export const supabase = createClient(supabaseUrl, supabaseKey);
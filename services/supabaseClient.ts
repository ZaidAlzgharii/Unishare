import { createClient } from '@supabase/supabase-js';

// Credentials for UniShare Supabase Project
const supabaseUrl = 'https://iusuzhplilrabrsduljs.supabase.co';
// Note: This key provided is being used directly. Ensure it matches the 'anon' public key 
// found in Project Settings > API on your Supabase dashboard.
const supabaseKey = 'sb_publishable_qX0SdDcRGVHr0ly8FZ7vVg_3baeS-tn';

export const supabase = createClient(supabaseUrl, supabaseKey);
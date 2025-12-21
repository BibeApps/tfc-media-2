
import { createClient } from '@supabase/supabase-js';

// Credentials provided by user
const supabaseUrl = 'https://alboektvgruofwtxuhfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYm9la3R2Z3J1b2Z3dHh1aGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzAyNDEsImV4cCI6MjA4MDU0NjI0MX0.9jCNEzdnljDKgsHVszf5Cxw5SJwr83uQDxTfD53DZI8';

export const isConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

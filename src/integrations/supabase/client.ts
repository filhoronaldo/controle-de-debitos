
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://drzfpfmmvixulmgyvoct.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyemZwZm1tdml4dWxtZ3l2b2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MDg4NzAsImV4cCI6MjA1NDA4NDg3MH0.Gm73lQqsizwK2jB1WwNZLoKQcYJYI4wI75hwNkvivKo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);


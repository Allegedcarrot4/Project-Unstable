import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zuiejqmhiyrnrswclppn.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aWVqcW1oaXlybnJzd2NscHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDg4NzIsImV4cCI6MjA5NDU4NDg3Mn0.L9e3qlVN8TcW2lo9uKJVLcjpRG2boxlhTgEzdWlgOKE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

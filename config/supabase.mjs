import { createClient } from "@supabase/supabase-js";

// สร้าง Supabase client สำหรับใช้งานทั่วไป
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// สร้าง Supabase client ที่มี token สำหรับ authenticated requests
export const createSupabaseClient = (token) => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};

export default supabase;

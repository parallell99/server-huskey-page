import { createClient } from "@supabase/supabase-js";

// สร้าง Supabase client สำหรับใช้งานทั่วไป (anon key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Client สำหรับอัปโหลด Storage (ใช้ service_role เพื่อ bypass RLS)
// ต้องตั้ง SUPABASE_SERVICE_ROLE_KEY ใน .env ให้เป็น key จริงจาก Supabase Dashboard → Settings → API
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useServiceRole =
  serviceKey &&
  !serviceKey.includes("xxxxxxxx") &&
  serviceKey.length > 100;

const supabaseStorage = useServiceRole
  ? createClient(process.env.SUPABASE_URL, serviceKey)
  : supabase;

export const isUsingServiceRoleForStorage = !!useServiceRole;

if (!useServiceRole) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY not set or invalid. Storage uploads will fail (RLS)."
  );
  console.warn(
    "   Fix: Supabase Dashboard → Settings → API → copy 'service_role' key → set in server/.env → restart server."
  );
} else {
  console.log("✅ Storage uploads using SUPABASE_SERVICE_ROLE_KEY (RLS bypass)");
}

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
export { supabaseStorage };

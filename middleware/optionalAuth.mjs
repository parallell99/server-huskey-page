import supabase from "../config/supabase.mjs";

// Optional auth middleware - ถ้ามี token จะ set req.user แต่ไม่บังคับให้ login
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        req.user = { ...data.user };
      }
    } catch (err) {
      // Ignore error - continue without user
    }
  }
  next();
};

export default optionalAuth;

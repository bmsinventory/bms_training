import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const SESSION_KEY = 'bms_quiz_admin';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // โหลด session จาก localStorage
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem(SESSION_KEY); }
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, created_at')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    const session = { id: data.id, username: data.username };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

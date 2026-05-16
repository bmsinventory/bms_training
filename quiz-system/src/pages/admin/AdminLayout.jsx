import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const isEmbedded = window.self !== window.top;

  useEffect(() => {
    if (!loading && !user && !isEmbedded) {
      window.location.replace('#/admin/login');
    }
  }, [user, loading]);

  if (loading) return <Loading text="กำลังตรวจสอบสิทธิ์..." />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
}

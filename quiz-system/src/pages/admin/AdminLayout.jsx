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
    <div style={{ background:'#f1f5f9', minHeight:'100vh' }}>
      <div style={{ padding:'16px' }}>
        <Outlet />
      </div>
    </div>
  );
}

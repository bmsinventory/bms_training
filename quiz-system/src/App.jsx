import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';

import Home             from './pages/Home';
import CategoryRedirect from './pages/CategoryRedirect';
import Register    from './pages/Register';
import Quiz        from './pages/Quiz';
import Result      from './pages/Result';
import Certificate from './pages/Certificate';
import ResendCert  from './pages/ResendCert';
import History     from './pages/History';

import AdminLogin     from './pages/admin/Login';
import AdminLayout    from './pages/admin/AdminLayout';
import Courses        from './pages/admin/Courses';
import Questions      from './pages/admin/Questions';
import Results        from './pages/admin/Results';
import AdminSettings  from './pages/admin/Settings';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/"                    element={<Home />} />
            <Route path="/category/:catId"     element={<CategoryRedirect />} />
            <Route path="/register/:courseId" element={<Register />} />
            <Route path="/quiz/:attemptId"  element={<Quiz />} />
            <Route path="/result/:attemptId" element={<Result />} />
            <Route path="/certificate/:attemptId" element={<Certificate />} />
            <Route path="/resend"           element={<ResendCert />} />
            <Route path="/history"          element={<History />} />

            {/* Admin — เข้าถึงผ่าน BMS Training Admin เท่านั้น */}
            <Route path="/admin/login"      element={<AdminLogin />} />
            <Route path="/admin"            element={<AdminLayout />}>
              <Route path="courses"         element={<Courses />} />
              <Route path="questions/:courseId" element={<Questions />} />
              <Route path="results"         element={<Results />} />
              <Route path="settings"        element={<AdminSettings />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

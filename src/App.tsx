import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LoginPage from './pages/Login';

// Placeholder for the real navigation shell (next slice) — exists here only
// to prove a protected route renders and logout actually clears the session.
function DashboardHome() {
  const { username, logout } = useAuth();
  return (
    <div className="container" style={{ paddingBlock: 48 }}>
      <h1>
        לוח בקרה<span className="dot" />
      </h1>
      <p style={{ color: 'var(--pearl-muted)', marginTop: 12 }}>
        {username ? `מחובר בתור ${username}` : 'התחברת בהצלחה'}
      </p>
      <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={logout}>
        התנתקות
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardHome />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

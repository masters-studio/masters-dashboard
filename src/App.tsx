import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import EmployeesList from './pages/Employees/EmployeesList';
import EmployeeForm from './pages/Employees/EmployeeForm';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<EmployeesList />} />
              <Route path="/employees/new" element={<EmployeeForm />} />
              <Route path="/employees/:id" element={<EmployeeForm />} />
              <Route path="/suppliers" element={<ComingSoon title="ספקים" />} />
              <Route path="/categories" element={<ComingSoon title="קטגוריות" />} />
              <Route path="/income" element={<ComingSoon title="הכנסות" />} />
              <Route path="/expenses" element={<ComingSoon title="הוצאות" />} />
              <Route path="/goals" element={<ComingSoon title="יעדים" />} />
              <Route path="/audit-log" element={<ComingSoon title="יומן שינויים" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

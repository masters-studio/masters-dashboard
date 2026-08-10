import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeesList from './pages/Employees/EmployeesList';
import EmployeeForm from './pages/Employees/EmployeeForm';
import SuppliersList from './pages/Suppliers/SuppliersList';
import SupplierForm from './pages/Suppliers/SupplierForm';
import CategoriesList from './pages/Categories/CategoriesList';
import CategoryForm from './pages/Categories/CategoryForm';
import IncomeTransactionsList from './pages/Income/IncomeTransactionsList';
import IncomeTransactionForm from './pages/Income/IncomeTransactionForm';
import ExpenseTransactionsList from './pages/Expenses/ExpenseTransactionsList';
import ExpenseTransactionForm from './pages/Expenses/ExpenseTransactionForm';
import GoalsList from './pages/Goals/GoalsList';
import GoalForm from './pages/Goals/GoalForm';
import AuditLogList from './pages/AuditLog/AuditLogList';

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
              <Route path="/suppliers" element={<SuppliersList />} />
              <Route path="/suppliers/new" element={<SupplierForm />} />
              <Route path="/suppliers/:id" element={<SupplierForm />} />
              <Route path="/categories" element={<CategoriesList />} />
              <Route path="/categories/new" element={<CategoryForm />} />
              <Route path="/categories/:id" element={<CategoryForm />} />
              <Route path="/income" element={<IncomeTransactionsList />} />
              <Route path="/income/new" element={<IncomeTransactionForm />} />
              <Route path="/income/:id" element={<IncomeTransactionForm />} />
              <Route path="/expenses" element={<ExpenseTransactionsList />} />
              <Route path="/expenses/new" element={<ExpenseTransactionForm />} />
              <Route path="/expenses/:id" element={<ExpenseTransactionForm />} />
              <Route path="/goals" element={<GoalsList />} />
              <Route path="/goals/new" element={<GoalForm />} />
              <Route path="/goals/:id" element={<GoalForm />} />
              <Route path="/audit-log" element={<AuditLogList />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

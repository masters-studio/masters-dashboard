import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'דשבורד', end: true },
  { to: '/employees', label: 'עובדים' },
  { to: '/suppliers', label: 'ספקים' },
  { to: '/categories', label: 'קטגוריות' },
  { to: '/income', label: 'הכנסות' },
  { to: '/expenses', label: 'הוצאות' },
  { to: '/goals', label: 'יעדים' },
  { to: '/audit-log', label: 'יומן שינויים' },
] as const;

/** Wraps every protected route — sidebar nav, logo, user/logout, then the page itself via <Outlet>. */
export function Layout() {
  const { username, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <img src="/logo.svg" alt="Masters Studio" className={styles.logo} />

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userBox}>
          {username && <span className={styles.username}>{username}</span>}
          <button className="btn btn-ghost" onClick={logout}>
            התנתקות
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

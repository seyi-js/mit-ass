import { useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { useAuth } from './auth';
import { ErrorMessage, Loading } from './components';
import { Role, roleLabels } from './types';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestsPage } from './pages/RequestsPage';
import { RequestFormPage } from './pages/RequestFormPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';

function Allowed({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    {
      to: '/requests',
      label:
        user.role === 'OFFICER'
          ? 'Assigned requests'
          : user.role === 'ADMIN'
            ? 'All requests'
            : 'My requests',
      icon: ClipboardList,
    },
    ...(user.role === 'ADMIN'
      ? [
          { to: '/users', label: 'Users', icon: Users },
          { to: '/reports', label: 'Reports', icon: BarChart3 },
        ]
      : []),
  ];
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          Campus Care<span className="brand-dot">.</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <p className="nav-label">Workspace</p>
        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              end={link.to === '/'}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <link.icon size={19} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-note">
            <span className="small-leaf">
              <Leaf size={19} />
            </span>
            <h3>Care for your campus.</h3>
            <p>One request at a time.</p>
          </div>
          <button
            className="nav-link logout"
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                setError((error as Error).message);
              }
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>University service desk</span>
          </div>
          <div className="profile">
            <div>
              <strong>{user.name}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <span className="avatar">
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <ErrorMessage message={error} />
          <Outlet />
        </main>
        <footer className="app-footer">
          Campus Care<span>University maintenance & service requests</span>
        </footer>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route element={<Allowed roles={['STUDENT', 'STAFF']} />}>
          <Route path="requests/new" element={<RequestFormPage />} />
        </Route>
        <Route element={<Allowed roles={['STUDENT', 'STAFF', 'ADMIN']} />}>
          <Route path="requests/:id/edit" element={<RequestFormPage />} />
        </Route>
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route element={<Allowed roles={['ADMIN']} />}>
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>Page not found</h1>
              <Link className="button primary" to="/">
                Back to overview
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

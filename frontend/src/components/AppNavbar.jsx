import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const studentNav = [
  { label: 'Вакансии', path: '/vacancies-public' },
  { label: 'Мои отклики', path: '/my-applications' },
  { label: 'Тесты', path: '/test' },
  { label: 'Аналитика', path: '/analytics' },
  { label: 'Профиль', path: '/profile' },
];

const companyNav = [
  { label: 'Вакансии', path: '/vacancies' },
  { label: 'Кандидаты', path: '/candidates' },
  { label: 'Аналитика', path: '/analytics' },
  { label: 'Профиль', path: '/profile' },
];

export default function AppNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isCompany } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = isCompany ? companyNav : studentNav;
  const currentPath = location.pathname;

  useEffect(() => {
    if (isCompany || !user) return undefined;
    let active = true;
    const loadUnread = async () => {
      try {
        const items = await api.notifications();
        if (active) setUnreadCount(items.filter(item => !item.is_read).length);
      } catch {
        if (active) setUnreadCount(0);
      }
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [isCompany, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-background/90 backdrop-blur-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            id="navbar-logo"
            className="flex items-center gap-2.5 flex-shrink-0"
            onClick={() => navigate(isCompany ? '/vacancies' : '/vacancies-public')}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-on-surface tracking-tight">CareerHub</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={currentPath === path ? 'nav-link-active' : 'nav-link'}
              >
                {label}
                {path === '/my-applications' && unreadCount > 0 && <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-error text-white text-[10px] inline-flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Role badge */}
            <span className={`badge text-[10px] ${isCompany ? 'badge-indigo' : user?.role === 'student' ? 'badge-blue' : 'badge-green'}`}>
              {isCompany ? 'Компания' : user?.role === 'student' ? 'Студент' : 'Соискатель'}
            </span>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface text-xs font-semibold select-none">
                {initials}
              </div>
              <span className="text-sm font-medium text-on-surface hidden lg:block">
                {user?.name || 'Пользователь'}
              </span>
            </div>

            {/* Logout */}
            <button
              id="navbar-logout"
              onClick={handleLogout}
              className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Выйти
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Меню"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-outline-variant/40 bg-background animate-fade-in">
            <div className="px-4 py-4 space-y-1">
              {navItems.map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPath === path
                      ? 'bg-surface-container text-on-surface border border-outline-variant'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {label}
                  {path === '/my-applications' && unreadCount > 0 && <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-error text-white text-[10px] inline-flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  <ChevronRight className={`${path === '/my-applications' && unreadCount > 0 ? '' : 'ml-auto'} w-4 h-4 text-outline`} />
                </button>
              ))}
              <div className="pt-3 border-t border-outline-variant/40">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface text-xs font-semibold">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-on-surface">{user?.name || 'Пользователь'}</div>
                    <div className="text-xs text-on-surface-variant">{isCompany ? 'Компания' : user?.role === 'student' ? 'Студент' : 'Соискатель'}</div>
                  </div>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

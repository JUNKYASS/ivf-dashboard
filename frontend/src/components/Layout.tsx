import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/parser', label: 'Парсер остатков' },
  { to: '/orders', label: 'Обработка заказов' },
  { to: '/stickers', label: 'Генерация стикеров' },
  { to: '/reviews', label: 'Отзывы' },
  { to: '/settings', label: 'Настройки' },
] as const;

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-title">Панель управления / IVANOVOFABRIC</span>
          <button
            type="button"
            className={`app-nav-toggle${navOpen ? ' is-open' : ''}`}
            aria-expanded={navOpen}
            aria-controls="app-nav"
            aria-label={navOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="app-nav-toggle-bar" />
            <span className="app-nav-toggle-bar" />
            <span className="app-nav-toggle-bar" />
          </button>
          <nav
            id="app-nav"
            className={`segmented-nav${navOpen ? ' is-open' : ''}`}
            aria-label="Разделы"
          >
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `segmented-link${isActive ? ' active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-title">Панель управления / IVANOVOFABRIC</span>
          <nav className="segmented-nav" aria-label="Разделы">
            <NavLink
              to="/parser"
              className={({ isActive }) => `segmented-link${isActive ? ' active' : ''}`}
            >
              Парсер остатков
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) => `segmented-link${isActive ? ' active' : ''}`}
            >
              Обработка заказов
            </NavLink>
            <NavLink
              to="/stickers"
              className={({ isActive }) => `segmented-link${isActive ? ' active' : ''}`}
            >
              Генерация стикеров
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

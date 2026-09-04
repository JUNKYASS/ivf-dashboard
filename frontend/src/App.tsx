import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ParserPage } from './pages/ParserPage';
import { OrdersPage } from './pages/OrdersPage';
import { SettingsPage } from './pages/SettingsPage';
import { StickersPage } from './pages/StickersPage';
import { ReviewsPage } from './pages/ReviewsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/parser" replace />} />
        <Route path="/parser" element={<ParserPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/stickers" element={<StickersPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

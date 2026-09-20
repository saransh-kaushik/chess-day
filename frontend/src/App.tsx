
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LocalGamePage } from './pages/LocalGamePage';
import { BotGamePage } from './pages/BotGamePage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { ReviewPage } from './pages/ReviewPage';
import { StatsPage } from './pages/StatsPage';
import { LoginPage } from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages that use the shared Layout (Navbar + content area) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="local" element={<LocalGamePage />} />
          <Route path="bot" element={<BotGamePage />} />
          <Route path="online" element={<OnlineGamePage />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
        {/* Full-screen pages (no shared layout) */}
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

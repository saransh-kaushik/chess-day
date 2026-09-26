
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LocalGamePage } from './pages/LocalGamePage';
import { BotGamePage } from './pages/BotGamePage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { ReviewPage } from './pages/ReviewPage';
import { PgnReviewPage } from './pages/PgnReviewPage';
import { StatsPage } from './pages/StatsPage';
import { LoginPage } from './pages/LoginPage';
import { MyGamesPage } from './pages/MyGamesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OpeningsPage } from './pages/OpeningsPage';
import { PuzzlePage } from './pages/PuzzlePage';

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
          <Route path="mygames" element={<MyGamesPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="openings" element={<OpeningsPage />} />
          <Route path="puzzles" element={<PuzzlePage />} />
        </Route>
        {/* Full-screen pages (no shared layout) */}
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/pgn" element={<PgnReviewPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

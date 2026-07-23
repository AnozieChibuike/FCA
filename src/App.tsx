import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import JoinFCA from './pages/JoinFCA';
import Leaderboards from './pages/Leaderboards';
import Profile from './pages/Profile';
import Memorial from './pages/Memorial';
import AdminConsole from './pages/AdminConsole';
import AdminDashboard from './pages/AdminDashboard';
import InviteLinks from './pages/InviteLinks';
import About from './pages/About';
import LichessCallback from './pages/LichessCallback';
import NotFound from './pages/NotFound';

function ProfileRedirect() {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={`/profile/${profile.id}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/join" element={<JoinFCA />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="/profile" element={<ProfileRedirect />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/memorial" element={<Memorial />} />
              <Route path="/admin" element={<AdminConsole />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/invites" element={<InviteLinks />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth/lichess/callback" element={<LichessCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/ui/Toast';
import { PageLoader } from './components/ui/misc';
import ScrollToTop from './components/ScrollToTop';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import Footer from './components/layout/Footer';
import Home from './pages/Home';

// Everything except Home loads on demand to keep the first load light on mobile data.
const Login = lazy(() => import('./pages/Login'));
const Join = lazy(() => import('./pages/Join'));
const Leaderboards = lazy(() => import('./pages/Leaderboards'));
const Profile = lazy(() => import('./pages/Profile'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const LichessCallback = lazy(() => import('./pages/LichessCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Compare = lazy(() => import('./pages/Compare'));
const Welcome = lazy(() => import('./pages/Welcome'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Memorial = lazy(() => import('./pages/Memorial'));
const About = lazy(() => import('./pages/About'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminImports = lazy(() => import('./pages/admin/AdminImports'));
const AdminGames = lazy(() => import('./pages/admin/AdminGames'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminInvites = lazy(() => import('./pages/admin/AdminInvites'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function ProfileRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={`/profile/${profile.id}`} replace />;
}

function LegacyLogin() {
  // Old invite links pointed at /login?invite=...&role=...; send them to the new flow.
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite');
  return invite && params.get('role') ? <Navigate to={`/join?invite=${encodeURIComponent(invite)}`} replace /> : <Login />;
}

function EventRedirect() {
  const { id } = useParams();
  return <Navigate to={`/events/${id}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <div className="mb-nav flex min-h-[100dvh] flex-col">
            <TopBar />
            <main className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<LegacyLogin />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/leaderboards" element={<Leaderboards />} />
                  <Route path="/rankings" element={<Navigate to="/leaderboards" replace />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/tournaments" element={<Navigate to="/events" replace />} />
                  <Route path="/tournaments/:id" element={<EventRedirect />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/profile" element={<ProfileRedirect />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/compare/:a/:b" element={<Compare />} />
                  <Route path="/memorial" element={<Memorial />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth/lichess/callback" element={<LichessCallback />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminOverview />} />
                    <Route path="imports" element={<AdminImports />} />
                    <Route path="games" element={<AdminGames />} />
                    <Route path="members" element={<AdminMembers />} />
                    <Route path="events" element={<AdminEvents />} />
                    <Route path="invites" element={<AdminInvites />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="dashboard" element={<Navigate to="/admin/members" replace />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <BottomNav />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

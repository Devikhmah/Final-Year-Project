import { useState, useEffect } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeesDashboard from './components/EmployeesDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import RejectedTasksDashboard from './components/RejectedTasksDashboard';
import ProfilePage from './components/ProfilePage';
import SetupBanner from './components/SetupBanner';
import AcceptInvite from './components/AcceptInvite';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const { themeTokens: t } = useTheme();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview');

  const isInviteFlow = window.location.pathname.startsWith('/accept-invite') ||
    window.location.hash.includes('type=invite') ||
    new URLSearchParams(window.location.search).has('token');

  useEffect(() => {
    const hardTimer = setTimeout(() => setLoading(false), 2000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          applyUserProfile(session.user);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Session error:', err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        applyUserProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(hardTimer);
    };
  }, []);

  const applyUserProfile = async (user) => {
    const metadataRole = user.user_metadata?.role || (user.email?.includes('manager') ? 'manager' : 'employee');
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: metadataRole,
    };
    setProfile(fallbackProfile);
    setLoading(false);

    try {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (data) setProfile(data);
    } catch (err) {
      console.warn('Profile fetch background:', err.message);
    }
  };

  if (isInviteFlow) return <AcceptInvite />;

  if (loading) {
    return (
      <div className={`min-h-screen ${t.bg} flex flex-col items-center justify-center p-4`}>
        <div className="w-10 h-10 border-4 border-[#006874] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className={`text-sm font-medium ${t.muted}`}>Loading Cadence Portal...</p>
      </div>
    );
  }

  if (!session) return <Auth />;

  const role = profile?.role || session.user.user_metadata?.role || 'employee';
  const isManager = role === 'manager';

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} flex flex-col`}>
      {!isConfigured && <SetupBanner />}
      <Navbar session={session} profile={profile} currentView={currentView} onNavigate={setCurrentView} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar role={role} currentView={currentView} onNavigate={setCurrentView} profile={profile} />

        <main className="flex-1 min-w-0">
          {currentView === 'overview' && (isManager ? <ManagerDashboard userProfile={profile} userSession={session} /> : <EmployeeDashboard userProfile={profile} userSession={session} />)}
          {currentView === 'employees' && isManager && <EmployeesDashboard userProfile={profile} userSession={session} />}
          {currentView === 'analytics' && isManager && <AnalyticsDashboard userProfile={profile} userSession={session} />}
          {currentView === 'rejected-tasks' && <RejectedTasksDashboard userProfile={profile} userSession={session} />}
          {currentView === 'profile' && <ProfilePage userProfile={profile} userSession={session} onProfileUpdate={setProfile} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

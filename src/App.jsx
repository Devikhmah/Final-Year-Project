import React, { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import SetupBanner from './components/SetupBanner';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import EmployeesDashboard from './components/EmployeesDashboard';
import ProfilePage from './components/ProfilePage';
import RejectedTasksDashboard from './components/RejectedTasksDashboard';

function MainApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { themeTokens } = useTheme();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Session error:', err);
        setLoading(false);
      })
      .finally(() => clearTimeout(safetyTimer));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCurrentView('overview');
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const fetchUserProfile = async (user) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(data);

      const userRole = data?.role || user?.user_metadata?.role || 'employee';

      if (userRole === 'manager') {
        fetchPendingCount(user.id);
      }
      fetchRejectedCount(user.id, userRole);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async (managerId) => {
    try {
      const mid = managerId || profile?.id || session?.user?.id;
      if (!mid) return;

      const { data: teamUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'employee')
        .eq('manager_id', mid);

      const teamEmployeeIds = (teamUsers || []).map((u) => u.id);

      const { data } = await supabase
        .from('tasks')
        .select('id, created_by, assigned_to')
        .eq('status', 'submitted');

      const scopedPending = (data || []).filter(
        (t) =>
          t.created_by === mid ||
          teamEmployeeIds.includes(t.assigned_to) ||
          t.assigned_to === mid
      );
      setPendingReviewCount(scopedPending.length);
    } catch (err) {
      console.error('Pending count fetch error:', err);
    }
  };

  const fetchRejectedCount = async (userId, role) => {
    try {
      let query = supabase.from('tasks').select('id, status, rejection_note');
      if (role === 'employee') {
        query = query.eq('assigned_to', userId);
      }
      const { data } = await query;
      const count = (data || []).filter(
        (t) => t.status === 'rejected' || (t.rejection_note && t.rejection_note.trim() !== '')
      ).length;
      setRejectedCount(count);
    } catch (err) {
      console.error('Rejected count fetch error:', err);
    }
  };

  if (!isConfigured) {
    return <SetupBanner />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const role = profile?.role || session?.user?.user_metadata?.role || 'employee';

  return (
    <div className={`h-screen overflow-hidden ${themeTokens.bg} ${themeTokens.text} flex flex-col md:flex-row font-sans transition-colors duration-200`}>
      {/* Sidebar Navigation */}
      <Sidebar
        userProfile={profile}
        userSession={session}
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingReviewCount={pendingReviewCount}
        rejectedCount={rejectedCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile Top Header */}
      <Navbar setMobileOpen={setMobileOpen} />

      {/* Main Content View */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {currentView === 'profile' ? (
          <ProfilePage
            key={session.user.id}
            userProfile={profile}
            userSession={session}
            onProfileUpdated={fetchUserProfile}
          />
        ) : currentView === 'rejected' ? (
          <RejectedTasksDashboard
            userProfile={profile}
            userSession={session}
            onTaskUpdated={() => fetchRejectedCount(session.user.id, role)}
          />
        ) : role === 'manager' ? (
          currentView === 'analytics' ? (
            <AnalyticsDashboard userProfile={profile} userSession={session} />
          ) : currentView === 'employees' ? (
            <EmployeesDashboard userProfile={profile} userSession={session} />
          ) : (
            <ManagerDashboard userProfile={profile} userSession={session} />
          )
        ) : (
          <EmployeeDashboard userProfile={profile} userSession={session} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

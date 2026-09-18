import React, { useEffect, useState } from 'react';
import authBg from '../assets/auth-bg.jpg';
import { supabase } from '../lib/supabase';

export default function AcceptInvite({ invitationId, onReturnToLogin }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (invitationId) {
      fetchInvitation();
    } else {
      setLoading(false);
    }
  }, [invitationId]);

  const fetchInvitation = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams(window.location.search);
      const isDirect = invitationId === 'direct' || params.get('manager');

      if (isDirect) {
        const mgrId = params.get('manager') || '';
        const nameParam = params.get('name') || '';
        const emailParam = params.get('email') || '';

        let mgrName = 'Your Manager';
        let mgrEmail = 'Manager';

        if (mgrId) {
          try {
            const { data: mgrData } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', mgrId)
              .maybeSingle();

            if (mgrData) {
              if (mgrData.full_name) mgrName = mgrData.full_name;
              if (mgrData.email) mgrEmail = mgrData.email;
            }
          } catch (e) {
            console.warn('Could not fetch manager profile:', e);
          }
        }

        setInvitation({
          id: 'direct',
          manager_id: mgrId,
          name: nameParam,
          email: emailParam,
          status: 'pending',
          managerName: mgrName,
          managerEmail: mgrEmail,
          isDirect: true,
        });
        return;
      }

      // Fetch invitation record from Supabase
      const { data: invData, error: invErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .maybeSingle();

      if (invErr) throw invErr;

      if (!invData) {
        throw new Error('Invitation not found or link has expired.');
      }

      // Fetch manager details if available
      if (invData.manager_id) {
        const { data: mgrData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', invData.manager_id)
          .maybeSingle();

        if (mgrData) {
          invData.managerName = mgrData.full_name;
          invData.managerEmail = mgrData.email;
        }
      }

      setInvitation(invData);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load invitation details.');
    } finally {
      setLoading(false);
    }
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [isExistingUserMode, setIsExistingUserMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setCurrentUser(data.session.user);
      }
    });
  }, []);

  const handleAcceptAsLoggedIn = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Update user profile to set manager_id
      const { error: userErr } = await supabase
        .from('users')
        .update({ manager_id: invitation.manager_id })
        .eq('id', currentUser.id);

      if (userErr) throw userErr;

      // 2. Mark invitation confirmed in db if exists
      if (invitation.id && invitation.id !== 'direct') {
        try {
          await supabase
            .from('invitations')
            .update({
              status: 'confirmed',
              responded_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);
        } catch (e) {
          console.warn('Could not update invitation record in db:', e);
        }
      }

      setSuccessMsg(`You have joined ${invitation.managerName}'s team! Redirecting to dashboard...`);
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (!isExistingUserMode && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let authedUserId = null;

      if (isExistingUserMode) {
        // Mode 1: User specified they already have an account -> sign in directly
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });
        if (signInErr) throw signInErr;
        authedUserId = signInData?.user?.id;
      } else {
        // Mode 2: Attempt standard signUp
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: {
            data: {
              full_name: invitation.name,
              role: 'employee',
              manager_id: invitation.manager_id,
            },
          },
        });

        // If user already exists in auth, seamlessly switch to sign-in verification!
        if (
          authErr &&
          (authErr.message?.toLowerCase().includes('already registered') ||
           authErr.message?.toLowerCase().includes('already exists') ||
           authErr.status === 422)
        ) {
          console.info('User already registered, attempting sign-in to link team...');
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });

          if (signInErr) {
            setIsExistingUserMode(true);
            throw new Error(
              'An account with this email already exists! Please enter your existing account password to join this team.'
            );
          }
          authedUserId = signInData?.user?.id;
        } else if (authErr) {
          throw authErr;
        } else {
          authedUserId = authData?.user?.id;
        }
      }

      // Link to manager's team in public.users
      if (authedUserId) {
        try {
          await supabase
            .from('users')
            .upsert({
              id: authedUserId,
              full_name: invitation.name,
              email: invitation.email,
              role: 'employee',
              manager_id: invitation.manager_id,
            });
        } catch (upsertErr) {
          console.warn('Profile upsert warning:', upsertErr);
        }
      }

      // Mark invitation as confirmed in db if exists
      if (invitation.id && invitation.id !== 'direct') {
        try {
          await supabase
            .from('invitations')
            .update({
              status: 'confirmed',
              responded_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);
        } catch (updateErr) {
          console.warn('Invitations table update warning:', updateErr);
        }
      }

      setSuccessMsg(`Welcome to the team! Connected to manager ${invitation.managerName}. Redirecting...`);
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this team invitation?')) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (invitation.id && invitation.id !== 'direct') {
        try {
          const { error } = await supabase
            .from('invitations')
            .update({
              status: 'declined',
              responded_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);

          if (error) console.warn('Could not update invitation decline:', error);
        } catch (updateErr) {
          console.warn('Invitations table not available:', updateErr);
        }
      }

      setInvitation((prev) => ({ ...prev, status: 'declined' }));
      setSuccessMsg('You have declined the invitation.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to decline invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative bg-[#000000] bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="absolute inset-0 bg-[#000000]/85 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] border border-[#1F1F1F] rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D9A441] text-[#000000] font-bold text-lg mb-2 shadow-md">
            WA
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Team Invitation
          </h1>
          <p className="text-xs text-slate-300">
            Workforce Productivity Portal
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-medium">Validating invitation details...</p>
          </div>
        ) : errorMsg && !invitation ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
            <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
            <button
              onClick={onReturnToLogin}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        ) : invitation?.status === 'confirmed' ? (
          <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
              ✓
            </div>
            <h3 className="text-sm font-bold text-emerald-400">Invitation Confirmed</h3>
            <p className="text-xs text-slate-300">
              This invitation has already been accepted. You can now sign in with your credentials.
            </p>
            <button
              onClick={onReturnToLogin}
              className="px-4 py-2 bg-[#D9A441] text-[#000000] text-xs font-bold rounded-lg hover:bg-[#C59336] transition-colors mt-2"
            >
              Go to Sign In
            </button>
          </div>
        ) : invitation?.status === 'declined' ? (
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-lg font-bold">
              ✕
            </div>
            <h3 className="text-sm font-bold text-rose-400">Invitation Declined</h3>
            <p className="text-xs text-slate-300">
              You declined this invitation. No employee account was created.
            </p>
            <button
              onClick={onReturnToLogin}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors mt-2"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            {/* Inviter Info Card */}
            <div className="p-4 rounded-xl bg-[#1B4B4F]/20 border border-[#D9A441]/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9A441]">Team Invitation</span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                <strong className="text-white">{invitation?.managerName || 'Your Manager'}</strong> ({invitation?.managerEmail || 'Manager'}) has invited you to join their team on Workforce Portal.
              </p>
              <div className="pt-2 border-t border-[#1F1F1F] text-[11px] text-slate-400 flex justify-between">
                <span>Invited Email:</span>
                <strong className="text-white">{invitation?.email}</strong>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {successMsg}
              </div>
            )}

            {/* If user is already logged in, show 1-click team join */}
            {currentUser ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Existing Account Detected</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    You are logged in as <strong className="text-white">{currentUser.user_metadata?.full_name || currentUser.email}</strong>.
                  </p>
                  <p className="text-xs text-slate-300">
                    Click below to join <strong className="text-white">{invitation?.managerName || 'Your Manager'}</strong>'s team. Your account will be connected immediately.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="py-3 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptAsLoggedIn}
                    disabled={submitting}
                    className="py-3 px-4 bg-[#D9A441] hover:bg-[#C59336] text-[#000000] font-bold rounded-lg text-xs transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <span>{submitting ? 'Joining Team...' : 'Accept & Join Team'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Account Setup / Sign-In Form */
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="text-[11px] text-slate-400">
                    {isExistingUserMode ? 'Existing User Sign In' : 'New Employee Account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExistingUserMode(!isExistingUserMode);
                      setErrorMsg('');
                    }}
                    className="text-[11px] text-[#D9A441] hover:underline font-semibold"
                  >
                    {isExistingUserMode ? 'Need a new account? Register' : 'Already have an account? Sign In'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={invitation?.name || ''}
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#1F1F1F] rounded-lg text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {isExistingUserMode ? 'Your Account Password *' : 'Create Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isExistingUserMode ? 'Enter your account password...' : 'At least 6 characters...'}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#1F1F1F] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs"
                  />
                </div>

                {!isExistingUserMode && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password..."
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#1F1F1F] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="py-3 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-3 px-4 bg-[#D9A441] hover:bg-[#C59336] text-[#000000] font-bold rounded-lg text-xs transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {submitting
                        ? 'Connecting...'
                        : isExistingUserMode
                        ? 'Sign In & Join Team'
                        : 'Create Account & Join'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center border-t border-[#1F1F1F]">
              <button
                type="button"
                onClick={onReturnToLogin}
                className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
              >
                Return to <span className="underline font-bold">Sign In</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

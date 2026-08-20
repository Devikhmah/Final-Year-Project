import React from 'react';

export default function SetupBanner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Supabase Connection Required</h1>
            <p className="text-sm text-slate-400">Your application needs your Supabase project API keys to connect.</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <h2 className="font-semibold text-white">How to connect:</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 text-xs leading-relaxed">
            <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Supabase Dashboard</a>.</li>
            <li>Click <strong>Project Settings</strong> (gear icon) &rarr; <strong>API</strong>.</li>
            <li>Copy your <strong>Project URL</strong> and <strong>anon / public key</strong>.</li>
            <li>Open the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">.env.local</code> file in your project folder.</li>
            <li>Paste your keys into <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">VITE_SUPABASE_URL</code> and <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Restart the development server (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">npm run dev</code>).</li>
          </ol>
        </div>

        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-lg">
          💡 <strong>Tip:</strong> Don't forget to run the SQL script in <code className="text-white font-mono font-semibold">supabase_setup.sql</code> in your Supabase SQL Editor!
        </div>
      </div>
    </div>
  );
}

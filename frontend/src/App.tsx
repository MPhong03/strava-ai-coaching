import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import StravaCallback from './pages/StravaCallback';
import { useAuthStore } from './store/useAuthStore';
import ActivityList from './components/ActivityList';
import DailyJournal from './components/DailyJournal';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import Layout from './components/layout/Layout';

const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const AiDashboard = lazy(() => import('./pages/AiDashboard'));
const Chat = lazy(() => import('./pages/Chat'));

const Dashboard: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = React.useState(false);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const handleSync = async (fetchAll = false) => {
    setSyncing(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/activities/sync${fetchAll ? '?fetchAll=true' : ''}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success(fetchAll ? 'Full history synced!' : 'Recent activities synced!');
    } catch (error) { toast.error('Failed to sync activities'); } finally { setSyncing(false); }
  };

  const copyFilteredJson = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/activities`, { headers: { Authorization: `Bearer ${token}` }, params: { startDate, endDate, export: 'true' } });
      const textToCopy = JSON.stringify(response.data.data, null, 2);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        toast.success('Activities JSON copied!');
      } else {
        // Fallback for non-secure contexts or mobile WebViews where navigator.clipboard might be missing
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Activities JSON copied!');
        } catch (err) {
          toast.error('Failed to copy JSON');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) { toast.error('Failed to export JSON'); }
  };

  return (
    <main className="py-6 sm:py-10 px-4 sm:px-8 w-full max-w-full overflow-x-hidden pb-32 min-w-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic text-orange-600">Runs Log</h2>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-10 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4 sm:gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-2.5 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-50 dark:bg-black border-none rounded-xl focus:ring-2 focus:ring-orange-500 px-4 py-2.5 text-sm dark:text-white" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={copyFilteredJson} className="flex-1 sm:flex-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition">Copy JSON</button>
            <button onClick={() => handleSync(true)} disabled={syncing} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition">{syncing ? '...' : 'Sync All'}</button>
            <button onClick={() => handleSync(false)} disabled={syncing} className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition">{syncing ? '...' : 'Sync Recent'}</button>
          </div>
        </div>
      </div>
      <div className="w-full overflow-hidden">
        <DailyJournal />
      </div>
      <div className="w-full overflow-hidden">
        <ActivityList startDate={startDate} endDate={endDate} />
      </div>
    </main>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAuthStore();

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: string) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(sys);
      } else root.classList.add(t);
    };
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      const url = new URL(data.url);
      const code = url.searchParams.get('code');
      if (code) { Browser.close(); navigate(`/auth/strava/bridge?code=${code}`); }
    });
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black font-black uppercase tracking-widest text-[10px] text-gray-400 italic">Loading Pacely...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/strava/bridge" element={<StravaCallback />} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Reports />} />
          <Route path="/activities" element={<Dashboard />} />
          <Route path="/activity/:id" element={<ActivityDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai-dashboard" element={<AiDashboard />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" reverseOrder={false} />
      <AppContent />
    </Router>
  );
}

export default App;

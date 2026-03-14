import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
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

// Lazy loading heavy pages
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const AiDashboard = lazy(() => import('./pages/AiDashboard'));
const Chat = lazy(() => import('./pages/Chat'));

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = React.useState(false);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const handleSync = async (fetchAll = false) => {
    setSyncing(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/activities/sync${fetchAll ? '?fetchAll=true' : ''}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success(fetchAll ? 'Full history synced!' : 'Recent activities synced!');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync activities');
    } finally {
      setSyncing(false);
    }
  };

  const copyFilteredJson = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate, export: 'true' }
      });
      navigator.clipboard.writeText(JSON.stringify(response.data.data, null, 2));
      toast.success('Filtered Activities JSON copied!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export JSON');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-4 sm:px-8 py-4 pt-[calc(1rem+var(--safe-area-inset-top))] flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold text-orange-600">AI Coach Dashboard</h1>
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
          <Link to="/chat" className="text-sm sm:text-base text-orange-600 hover:text-orange-700 font-bold">AI Partner</Link>
          <Link to="/reports" className="text-sm sm:text-base text-gray-600 hover:text-orange-500 font-medium">Reports</Link>
          <Link to="/ai-dashboard" className="text-sm sm:text-base text-gray-600 hover:text-orange-500 font-medium">AI Usage</Link>
          <Link to="/profile" className="text-sm sm:text-base text-gray-600 hover:text-orange-500 font-medium">Coach Settings</Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="text-sm sm:text-base text-gray-600 font-semibold">{user?.name}</span>
          <button onClick={logout} className="text-xs sm:text-sm text-gray-500 hover:text-red-500 font-medium border border-gray-200 px-2 py-1 rounded sm:border-none sm:p-0">Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4 sm:gap-6">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dash-start-date" className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Start Date</label>
                <input
                  id="dash-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="dash-end-date" className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">End Date</label>
                <input
                  id="dash-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 px-4 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={copyFilteredJson} className="flex-1 sm:flex-none bg-gray-800 text-white px-6 py-2.5 rounded-md font-medium hover:bg-gray-700 transition text-sm">Copy JSON</button>
              <button onClick={() => handleSync(true)} disabled={syncing} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-md font-medium transition duration-150 text-sm">{syncing ? 'Syncing...' : 'Sync All'}</button>
              <button onClick={() => handleSync(false)} disabled={syncing} className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2.5 rounded-md font-bold transition duration-150 text-sm">{syncing ? 'Syncing...' : 'Sync Recent'}</button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Recent Runs</h2>
        </div>

        <DailyJournal />
        <ActivityList startDate={startDate} endDate={endDate} />
      </main>
    </div>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
};

// Component chính xử lý Deep Linking
const AppContent: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Lắng nghe sự kiện mở App qua URL (Deep Link)
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      // Ví dụ URL: aicoach://callback?code=abc123...
      const url = new URL(data.url);
      const code = url.searchParams.get('code');
      
      if (code) {
        // Đóng trình duyệt in-app (nếu đang mở)
        Browser.close();
        // Chuyển hướng đến trang callback với mã code nhận được
        navigate(`/auth/strava/callback?code=${code}`);
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/strava/callback" element={<StravaCallback />} />
        <Route path="/activity/:id" element={<PrivateRoute><ActivityDetail /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/ai-dashboard" element={<PrivateRoute><AiDashboard /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
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

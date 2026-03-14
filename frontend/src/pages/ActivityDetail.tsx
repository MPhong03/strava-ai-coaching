import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import InsightCard from '../components/InsightCard';
import DailyJournal from '../components/DailyJournal';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!token && !!id,
  });

  const activityDate = activity?.start_date?.split('T')[0];

  const { data: journalData } = useQuery({
    queryKey: ['daily-journal', activityDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/journal`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: activityDate }
      });
      return response.data.data;
    },
    enabled: !!token && !!activityDate
  });

  const { data: insightData, isLoading: insightLoading } = useQuery({
    queryKey: ['insight', id],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities/${id}/insight`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!token && !!id,
  });

  const generateInsight = async () => {
    if (!journalData?.content) {
      toast.error('Please add Daily Journal notes for this day before calling AI Coach!');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.get(`${apiUrl}/activities/${id}/insight?generate=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.setQueryData(['insight', id], response.data.data);
      toast.success('AI Insight generated successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to call AI Coach';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyJson = () => {
    if (activity?.raw_json) {
      navigator.clipboard.writeText(activity.raw_json);
      toast.success('Activity JSON copied to clipboard!');
    }
  };

  if (activityLoading) return <div className="p-8 text-center text-gray-400">Loading activity...</div>;

  const rawData = activity ? JSON.parse(activity.raw_json) : null;
  const splits = rawData?.splits_metric || [];
  
  const chartData = splits.map((s: any, index: number) => ({
    km: index + 1,
    pace: (s.moving_time / 60) / (s.distance / 1000),
    elevation: s.elevation_difference,
  }));

  const insight = insightData?.insight;
  const limit = insightData?.limit;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-orange-500 hover:text-orange-600 font-medium">
            &larr; Back to Dashboard
          </Link>
          <button
            onClick={copyJson}
            className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition"
          >
            Copy Raw JSON
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{activity?.name}</h1>
              <p className="text-gray-500 text-sm sm:text-base">{new Date(activity?.start_date).toLocaleString()}</p>
            </div>
            <div className="text-right w-full sm:w-auto">
              <div className="text-3xl sm:text-4xl font-black text-orange-500">
                {(activity?.distance / 1000).toFixed(2)} <span className="text-lg">km</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 py-6 sm:py-8 border-y border-gray-50">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-1">Pace</p>
              <p className="text-base sm:text-xl font-bold">
                {activity && Math.floor((activity.moving_time / 60) / (activity.distance / 1000))}:
                {activity && Math.floor(((activity.moving_time / 60) / (activity.distance / 1000) % 1) * 60).toString().padStart(2, '0')} /km
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-1">Time</p>
              <p className="text-base sm:text-xl font-bold">
                {activity && Math.floor(activity.moving_time / 3600)}h {activity && Math.floor((activity.moving_time % 3600) / 60)}m
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-1">Elevation</p>
              <p className="text-base sm:text-xl font-bold">{activity?.total_elevation_gain} m</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-1">Calories</p>
              <p className="text-base sm:text-xl font-bold">{activity?.calories || 0} kcal</p>
            </div>
          </div>
        </div>

        {/* Daily Journal for this activity date */}
        {activityDate && (
          <div className="mb-8">
            <DailyJournal initialDate={activityDate} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Coaching Insights</h2>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {limit && (
              <span className="text-[10px] sm:text-xs font-medium text-gray-400 italic">
                Daily limits: {limit.remaining}/{limit.total} remaining
              </span>
            )}
            <button
              onClick={generateInsight}
              disabled={analyzing || (limit && limit.remaining === 0)}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-md font-bold transition shadow-sm text-sm"
            >
              {analyzing ? 'Thinking...' : (insight ? 'Regenerate Analysis' : 'Get AI Insight')}
            </button>
          </div>
        </div>

        {insightLoading ? (
          <div className="py-12 bg-white rounded-xl shadow-sm border border-gray-100 mb-8 text-center text-gray-400">
            Checking for existing insights...
          </div>
        ) : insight ? (
          <div className="mb-8">
            <InsightCard insight={insight} />
          </div>
        ) : (
          <div className="py-12 bg-white rounded-xl shadow-sm border border-gray-100 mb-8 text-center px-6">
            <p className="text-gray-500">Ready to analyze! Click the button above to get AI insights.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6">Pace Chart (min/km)</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="km" tick={{fontSize: 12}} />
                  <YAxis reversed domain={['auto', 'auto']} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pace" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6">Splits</h3>
            <div className="overflow-y-auto max-h-64">
              <table className="w-full">
                <thead className="text-left text-[10px] text-gray-400 font-bold uppercase">
                  <tr>
                    <th className="pb-3">KM</th>
                    <th className="pb-3">Pace</th>
                    <th className="pb-3">Elev</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {chartData.map((s: any) => (
                    <tr key={s.km} className="border-t border-gray-50">
                      <td className="py-2 font-medium text-gray-900">{s.km}</td>
                      <td className="py-2 text-gray-700">
                        {Math.floor(s.pace)}:
                        {Math.floor((s.pace % 1) * 60).toString().padStart(2, '0')}
                      </td>
                      <td className="py-2 text-gray-500">{s.elevation}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;

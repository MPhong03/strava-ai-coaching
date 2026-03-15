import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import InsightCard from '../components/InsightCard';
import DailyJournal from '../components/DailyJournal';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
      const response = await axios.get(`${apiUrl}/activities/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data;
    },
    enabled: !!token && !!id,
  });

  const activityDate = activity?.start_date?.split('T')[0];

  const { data: journalData } = useQuery({
    queryKey: ['daily-journal', activityDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/journal`, { headers: { Authorization: `Bearer ${token}` }, params: { date: activityDate } });
      return response.data.data;
    },
    enabled: !!token && !!activityDate
  });

  const { data: insightData, isLoading: insightLoading } = useQuery({
    queryKey: ['insight', id],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities/${id}/insight`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data;
    },
    enabled: !!token && !!id,
  });

  const generateInsight = async () => {
    if (!journalData?.content) { toast.error('Please add Daily Journal notes first!'); return; }
    setAnalyzing(true);
    try {
      const response = await axios.get(`${apiUrl}/activities/${id}/insight?generate=true`, { headers: { Authorization: `Bearer ${token}` } });
      queryClient.setQueryData(['insight', id], response.data.data);
      toast.success('AI Insight generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to call AI Coach');
    } finally { setAnalyzing(false); }
  };

  const copyJson = () => {
    if (activity?.raw_json) {
      navigator.clipboard.writeText(activity.raw_json);
      toast.success('JSON copied!');
    }
  };

  if (activityLoading) return <div className="p-8 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading activity...</div>;

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
    <div className="py-6 sm:py-10 px-4 sm:px-8 max-w-7xl mx-auto pb-32 lg:pb-10">
      <div className="flex justify-between items-center mb-8">
        <Link to="/activities" className="text-orange-500 hover:text-orange-600 font-black text-[10px] uppercase tracking-widest">
          &larr; All Activities
        </Link>
        <button onClick={copyJson} className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition">
          Copy Raw JSON
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-10 mb-10">
        <div className="flex flex-col sm:row justify-between items-start mb-10 gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter uppercase italic">{activity?.name}</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">{new Date(activity?.start_date).toLocaleString()}</p>
          </div>
          <div className="bg-orange-500/10 dark:bg-orange-500/20 px-6 py-4 rounded-2xl border border-orange-500/20">
            <div className="text-4xl sm:text-5xl font-black text-orange-500 italic tracking-tighter">
              {(activity?.distance / 1000).toFixed(2)} <span className="text-xl uppercase not-italic">km</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-y border-gray-50 dark:border-gray-800">
          {[
            { label: 'Pace', value: `${activity && Math.floor((activity.moving_time / 60) / (activity.distance / 1000))}:${activity && Math.floor(((activity.moving_time / 60) / (activity.distance / 1000) % 1) * 60).toString().padStart(2, '0')} /km` },
            { label: 'Time', value: `${activity && Math.floor(activity.moving_time / 3600)}h ${activity && Math.floor((activity.moving_time % 3600) / 60)}m` },
            { label: 'Elevation', value: `${activity?.total_elevation_gain} m` },
            { label: 'Calories', value: `${activity?.calories || 0} kcal` },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-[0.2em]">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-black dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {activityDate && <div className="mb-10"><DailyJournal initialDate={activityDate} /></div>}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">AI Coaching Insight</h2>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {limit && <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Daily: {limit.remaining}/{limit.total}</span>}
          <button
            onClick={generateInsight} disabled={analyzing || (limit && limit.remaining === 0)}
            className="bg-gray-900 dark:bg-orange-600 hover:scale-105 active:scale-95 disabled:bg-gray-300 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg"
          >
            {analyzing ? 'Thinking...' : (insight ? 'Regenerate Analysis' : 'Get AI Insight')}
          </button>
        </div>
      </div>

      {insightLoading ? (
        <div className="py-20 bg-white dark:bg-gray-900 rounded-3xl text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Analyzing data...</div>
      ) : insight ? (
        <div className="mb-10"><InsightCard insight={insight} /></div>
      ) : (
        <div className="py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-center px-6">
          <p className="text-gray-500 font-bold">Ready to analyze! Click the button above to get AI insights.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-8 tracking-[0.2em]">Pace Analysis (min/km)</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="km" stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                <YAxis reversed domain={['auto', 'auto']} stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="pace" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-8 tracking-[0.2em]">Split Times</h3>
          <div className="overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full">
              <thead className="text-left text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
                <tr>
                  <th className="pb-4">KM</th>
                  <th className="pb-4">Pace</th>
                  <th className="pb-4">Elev</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold">
                {chartData.map((s: any) => (
                  <tr key={s.km} className="border-t border-gray-50 dark:border-gray-800">
                    <td className="py-3 text-gray-900 dark:text-gray-100">{s.km}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {Math.floor(s.pace)}:{Math.floor((s.pace % 1) * 60).toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 text-gray-400 dark:text-gray-500">{s.elevation}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;

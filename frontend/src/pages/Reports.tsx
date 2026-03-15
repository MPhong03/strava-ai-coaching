import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const getDefaultDates = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diffToMonday));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [rangeType, setRangeType] = useState('current_week');

  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (rangeType === 'current_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (rangeType === 'last_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      start = new Date(now.setDate(diff));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (rangeType === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (rangeType === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    if (rangeType !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [rangeType]);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['performance-report', startDate, endDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/reports/performance`, { headers: { Authorization: `Bearer ${token}` }, params: { startDate, endDate } });
      return response.data.data;
    },
    enabled: !!token,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities?limit=100`, { headers: { Authorization: `Bearer ${token}` }, params: { startDate, endDate } });
      return response.data.data.data;
    },
    enabled: !!token,
  });

  const generateReportAI = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.get(`${apiUrl}/reports/performance`, { headers: { Authorization: `Bearer ${token}` }, params: { startDate, endDate, generate: 'true' } });
      queryClient.setQueryData(['performance-report', startDate, endDate], response.data.data);
      toast.success('AI Review generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to call AI Coach');
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = activitiesData?.map((a: any) => ({
    date: new Date(a.start_date).toLocaleDateString(),
    distance: a.distance / 1000,
    pace: (a.moving_time / 60) / (a.distance / 1000),
  })).reverse();

  const report = reportData?.report;
  const limit = reportData?.limit;

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic dark:text-white">Performance</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select 
            value={rangeType} onChange={(e) => setRangeType(e.target.value)}
            className="bg-white dark:bg-gray-900 border-none rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 text-xs font-black uppercase tracking-widest px-4 py-2.5 dark:text-white"
          >
            <option value="current_week">Current Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
          {rangeType === 'custom' && (
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white dark:bg-gray-900 border-none rounded-xl text-xs px-3 py-2 dark:text-white shadow-sm" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white dark:bg-gray-900 border-none rounded-xl text-xs px-3 py-2 dark:text-white shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-10 overflow-x-auto pb-2">
          {[
            { label: 'Activities', value: report.activity_count, color: 'text-gray-800 dark:text-gray-200' },
            { label: 'Distance', value: `${(report.total_distance / 1000).toFixed(1)} km`, color: 'text-orange-600' },
            { label: 'Elevation', value: `${Math.round(report.total_elevation_gain)} m`, color: 'text-gray-800 dark:text-gray-200' },
            { label: 'Calories', value: `${Math.round(report.total_calories)} kcal`, color: 'text-gray-800 dark:text-gray-200' },
            { label: 'Avg Pace', value: `${Math.floor(report.avg_pace)}:${Math.floor((report.avg_pace % 1) * 60).toString().padStart(2, '0')} /km`, color: 'text-gray-800 dark:text-gray-200', colSpan: 'col-span-2 lg:col-span-1' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 min-w-[140px] ${stat.colSpan || ''}`}>
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-[0.2em]">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-10">
        {[
          { title: 'Distance Trend', type: 'bar' },
          { title: 'Pace Stability', type: 'line' }
        ].map((chart, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-6 tracking-[0.2em]">{chart.title}</h3>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chart.type === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="distance" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis reversed domain={['auto', 'auto']} stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="pace" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight italic">AI Coach Review</h3>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {limit && <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Weekly: {limit.remaining}/{limit.total}</span>}
          <button
            onClick={generateReportAI} disabled={analyzing || (limit && limit.remaining === 0)}
            className="bg-gray-900 dark:bg-orange-600 hover:scale-105 active:scale-95 disabled:bg-gray-300 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg"
          >
            {analyzing ? 'Thinking...' : (report?.trend_insight ? 'Regenerate' : 'Get Review')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 bg-white dark:bg-gray-900 rounded-3xl text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading AI...</div>
      ) : report?.trend_insight ? (
        <div className="bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-black border border-orange-100 dark:border-gray-800 p-6 sm:p-10 rounded-3xl shadow-sm">
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-gray-800 dark:text-gray-300 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.trend_insight}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-center text-gray-500 font-bold text-sm">No analysis for this period. Click Get Review!</div>
      )}
    </div>
  );
};

export default Reports;

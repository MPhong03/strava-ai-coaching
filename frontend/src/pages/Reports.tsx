import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  // Mặc định tuần hiện tại
  const getDefaultDates = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diffToMonday));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
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
      const response = await axios.get(`${apiUrl}/reports/performance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data.data;
    },
    enabled: !!token,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data.data.data;
    },
    enabled: !!token,
  });

  const generateReportAI = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.get(`${apiUrl}/reports/performance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate, generate: 'true' }
      });
      queryClient.setQueryData(['performance-report', startDate, endDate], response.data.data);
      toast.success('AI Review generated!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to call AI Coach';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = activitiesData
    ?.map((a: any) => ({
      date: new Date(a.start_date).toLocaleDateString(),
      distance: a.distance / 1000,
      pace: (a.moving_time / 60) / (a.distance / 1000),
    }))
    .reverse();

  const report = reportData?.report;
  const limit = reportData?.limit;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="text-orange-500 hover:text-orange-600 mb-4 sm:mb-6 inline-block font-medium text-sm sm:text-base">
          &larr; Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Performance Reports</h2>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select 
              id="range-type"
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm px-3 py-2 bg-white"
            >
              <option value="current_week">Current Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            {rangeType === 'custom' && (
              <div className="flex gap-2">
                <input 
                  id="report-start-date"
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm text-sm px-2 py-1"
                />
                <input 
                  id="report-end-date"
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm text-sm px-2 py-1"
                />
              </div>
            )}
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 overflow-x-auto pb-2">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-w-[140px]">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Activities</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{report.activity_count}</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-w-[140px]">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Distance</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{(report.total_distance / 1000).toFixed(1)} km</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-w-[140px]">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Elevation</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{Math.round(report.total_elevation_gain)} m</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-w-[140px]">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Calories</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{Math.round(report.total_calories)} kcal</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-w-[140px] col-span-2 lg:col-span-1">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Avg Pace</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">
                {Math.floor(report.avg_pace)}:{Math.floor((report.avg_pace % 1) * 60).toString().padStart(2, '0')} /km
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">Performance Trend</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="distance" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800">Pace Stability</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis reversed domain={['auto', 'auto']} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pace" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">AI Coach Review</h3>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {limit && (
              <span className="text-[10px] sm:text-xs font-medium text-gray-400 italic">
                Weekly calls: {limit.remaining}/{limit.total} left
              </span>
            )}
            <button
              onClick={generateReportAI}
              disabled={analyzing || (limit && limit.remaining === 0)}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-md font-bold transition shadow-sm text-sm"
            >
              {analyzing ? 'Thinking...' : (report?.trend_insight ? 'Regenerate' : 'Get Review')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 bg-white rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
            Loading...
          </div>
        ) : report?.trend_insight ? (
          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-6 sm:p-8 rounded-xl shadow-sm">
            <div className="prose prose-sm sm:prose-orange max-w-none text-orange-900 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.trend_insight}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="py-12 bg-white rounded-xl shadow-sm border border-gray-100 text-center text-gray-500 text-sm">
            No AI analysis for this period. Click Get Review!
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

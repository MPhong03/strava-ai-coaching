import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const AiDashboard: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;

  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/ai/usage`, { headers: { Authorization: `Bearer ${token}` } });
      return response.data.data;
    },
    enabled: !!token,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Intelligence...</div>;

  const chartData = usage?.history?.map((h: any) => ({
    date: new Date(h.created_at).toLocaleDateString(),
    tokens: h.total_tokens,
    type: h.type
  })).reverse() || [];

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-8 max-w-5xl mx-auto pb-32 lg:pb-10">
      <h2 className="text-3xl sm:text-4xl font-black mb-10 tracking-tighter uppercase italic dark:text-white">AI Intelligence</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Today's Consumption</p>
          <p className="text-3xl font-black dark:text-white">{usage?.daily?.tokens.toLocaleString()} <span className="text-xs font-bold text-gray-400">tokens</span></p>
          <p className="text-[10px] font-bold text-green-600 mt-2 uppercase">{usage?.daily?.calls} requests handled</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Monthly Consumption</p>
          <p className="text-3xl font-black text-orange-600">{usage?.monthly?.tokens.toLocaleString()} <span className="text-xs font-bold text-gray-400">tokens</span></p>
          <p className="text-[10px] font-bold text-orange-500 mt-2 uppercase">{usage?.monthly?.calls} requests this month</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-10">
        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8">Token Usage History</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" hide />
              <YAxis stroke="#9ca3af" fontSize={10} fontWeight="bold" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="tokens" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-full">
        <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recent Requests</h3>
        </div>
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 w-full">
          <table className="min-w-[600px] w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] bg-gray-50/50 dark:bg-black/20">
                <th className="px-8 py-4">Time</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Model</th>
                <th className="px-8 py-4">Tokens</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-50 dark:divide-gray-800">
              {usage?.history?.map((h: any) => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-black/40 transition">
                  <td className="px-8 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {new Date(h.created_at).toLocaleString()}
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${h.type === 'ACTIVITY' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                      {h.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 font-bold dark:text-gray-200">{h.model_name}</td>
                  <td className="px-8 py-4 font-mono text-gray-900 dark:text-gray-100">{h.total_tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AiDashboard;

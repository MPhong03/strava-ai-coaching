import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const AiDashboard: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;

  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/ai/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!token,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading AI usage stats...</div>;

  const chartData = usage?.history?.map((h: any) => ({
    date: new Date(h.created_at).toLocaleDateString(),
    tokens: h.total_tokens,
    type: h.type
  })).reverse() || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="text-orange-500 hover:text-orange-600 mb-6 inline-block font-medium">&larr; Back to Dashboard</Link>
        <h2 className="text-3xl font-bold mb-8">AI Intelligence Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Consumption</p>
            <p className="text-3xl font-black text-gray-900">{usage?.daily?.tokens.toLocaleString()} <span className="text-sm font-normal text-gray-400">tokens</span></p>
            <p className="text-xs text-gray-500 mt-2">{usage?.daily?.calls} AI Coach requests today</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Consumption</p>
            <p className="text-3xl font-black text-orange-600">{usage?.monthly?.tokens.toLocaleString()} <span className="text-sm font-normal text-gray-400">tokens</span></p>
            <p className="text-xs text-gray-500 mt-2">{usage?.monthly?.calls} AI Coach requests this month</p>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-bold mb-6">Token Usage History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Recent Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Tokens</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {usage?.history?.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${h.type === 'ACTIVITY' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{h.model_name}</td>
                    <td className="px-6 py-4 font-mono text-gray-900">{h.total_tokens}</td>
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

export default AiDashboard;

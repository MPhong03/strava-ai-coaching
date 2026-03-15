import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';

interface Activity {
  id: string;
  name: string;
  start_date: string;
  distance: number;
  moving_time: number;
  average_speed: number;
}

interface Props {
  startDate?: string;
  endDate?: string;
}

const ActivityList: React.FC<Props> = ({ startDate, endDate }) => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['activities', startDate, endDate, page],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate, page, limit }
      });
      return response.data.data;
    },
    enabled: !!token,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading runs...</div>;
  if (error) return <div className="p-8 text-red-500 text-center font-bold">Error loading activities</div>;

  const activities: Activity[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, last_page: 1 };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-black/20">
            <tr>
              <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest w-16">#</th>
              <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Activity Name</th>
              <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Distance</th>
              <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Moving Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {activities.map((activity, index) => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-black/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                  {(page - 1) * limit + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 dark:text-gray-400">
                  {new Date(activity.start_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-orange-600">
                  <Link to={`/activity/${activity.id}`} className="hover:underline tracking-tight uppercase italic">
                    {activity.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-900 dark:text-gray-100 italic">
                  {(activity.distance / 1000).toFixed(2)} KM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 dark:text-gray-400">
                  {Math.floor(activity.moving_time / 60)}m {activity.moving_time % 60}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-12 text-center text-gray-500 font-bold text-sm italic">No activities found. Try syncing!</div>
      ) : (
        <div className="bg-gray-50/50 dark:bg-black/20 px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Page {meta.page} of {meta.last_page} <span className="mx-2 text-gray-200 dark:text-gray-700">|</span> {meta.total} Runs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;

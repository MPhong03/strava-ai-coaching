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

  if (isLoading) return <div className="p-4 text-center">Loading activities...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error loading activities</div>;

  const activities: Activity[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, last_page: 1 };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity, index) => (
              <tr key={activity.id} className="hover:bg-gray-50 transition duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {(page - 1) * limit + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(activity.start_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                  <Link to={`/activity/${activity.id}`} className="hover:underline">
                    {activity.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(activity.distance / 1000).toFixed(2)} km
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {Math.floor(activity.moving_time / 60)}m {activity.moving_time % 60}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No activities found. Try syncing!</div>
      ) : (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{meta.page}</span> of <span className="font-medium">{meta.last_page}</span> ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;

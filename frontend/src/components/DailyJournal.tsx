import React, { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Props {
  initialDate?: string; // YYYY-MM-DD
  readOnly?: boolean;
}

const DailyJournal: React.FC<Props> = ({ initialDate, readOnly = false }) => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  
  // Lấy ngày địa phương hiện tại nếu không có initialDate
  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(initialDate || getLocalDate());
  const [content, setContent] = useState('');

  // Fetch Journal
  const { isLoading } = useQuery({
    queryKey: ['daily-journal', selectedDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/journal`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: selectedDate }
      });
      const journalContent = response.data.data?.content || '';
      setContent(journalContent);
      return response.data.data;
    },
    enabled: !!token && !!selectedDate
  });

  // Mutation for Saving
  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      await axios.post(`${apiUrl}/journal`, 
        { date: selectedDate, content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-journal', selectedDate] });
      // Nếu ở trang chi tiết, cần invalidate insight để AI biết đã có journal mới
      queryClient.invalidateQueries({ queryKey: ['insight'] });
      toast.success(`Journal saved for ${selectedDate}!`);
    },
    onError: () => toast.error('Failed to save journal')
  });

  if (isLoading) return <div className="animate-pulse bg-white h-32 rounded-xl border border-gray-100 mb-8"></div>;

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${readOnly ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'} mb-8`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <h3 className="font-bold text-gray-800">
            {readOnly ? 'Daily Context for this Run' : 'Daily Journal'}
          </h3>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-3">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs border-gray-200 rounded-md py-1 px-2 focus:ring-orange-500"
            />
            <button
              onClick={() => mutation.mutate(content)}
              disabled={mutation.isPending || !content.trim()}
              className="text-sm font-bold text-orange-600 hover:text-orange-700 disabled:text-gray-300 transition"
            >
              {mutation.isPending ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        )}
      </div>

      <textarea
        placeholder={readOnly ? "No notes for this day." : "What did you eat? Any extra workouts? How do you feel?"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={readOnly}
        className={`w-full border border-gray-50 rounded-lg focus:ring-1 focus:ring-orange-100 focus:border-orange-200 text-sm text-gray-600 placeholder-gray-300 resize-none h-24 px-4 py-3 bg-transparent transition-all ${readOnly ? 'italic' : ''}`}
      />
      
      {!readOnly && (
        <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
          <p className="text-[10px] text-gray-400 italic">
            This context is REQUIRED for high-quality AI Coaching Insights.
          </p>
          <span className="text-[10px] font-medium text-gray-300">
            {content.length} chars
          </span>
        </div>
      )}
    </div>
  );
};

export default DailyJournal;

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
  
  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(initialDate || getLocalDate());
  const [content, setContent] = useState('');

  const { isLoading } = useQuery({
    queryKey: ['daily-journal', selectedDate],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/journal`, { headers: { Authorization: `Bearer ${token}` }, params: { date: selectedDate } });
      const journalContent = response.data.data?.content || '';
      setContent(journalContent);
      return response.data.data;
    },
    enabled: !!token && !!selectedDate
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      await axios.post(`${apiUrl}/journal`, { date: selectedDate, content: newContent }, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-journal', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['insight'] });
      toast.success(`Journal saved!`);
    },
    onError: () => toast.error('Failed to save journal')
  });

  if (isLoading) return <div className="animate-pulse bg-white dark:bg-gray-900 h-32 rounded-3xl border border-gray-100 dark:border-gray-800 mb-10"></div>;

  return (
    <div className={`bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border ${readOnly ? 'border-orange-500/20 bg-orange-50/10 dark:bg-orange-900/10' : 'border-gray-100 dark:border-gray-800'} mb-10 transition-colors`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✍️</span>
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
            {readOnly ? 'Run Context' : 'Daily Journal'}
          </h3>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-3">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-black border-none rounded-xl py-2 px-3 focus:ring-2 focus:ring-orange-500 dark:text-white"
            />
            <button
              onClick={() => mutation.mutate(content)}
              disabled={mutation.isPending || !content.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-500/10"
            >
              {mutation.isPending ? '...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <textarea
        placeholder={readOnly ? "No notes for this day." : "What did you eat? Any extra workouts? How do you feel?"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={readOnly}
        className={`w-full bg-gray-50 dark:bg-black border-none rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-700 resize-none h-28 px-5 py-4 transition-all ${readOnly ? 'italic opacity-80' : ''}`}
      />
      
      {!readOnly && (
        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest italic">
            Required for AI Insights
          </p>
          <span className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">
            {content.length} chars
          </span>
        </div>
      )}
    </div>
  );
};

export default DailyJournal;

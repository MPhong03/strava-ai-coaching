import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_logs?: string; // JSON string
  created_at: string;
}

const Chat: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const apiUrl = process.env.REACT_APP_API_URL;
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [aiStatus, setAiStatus] = useState<{ status: string, toolName?: string }>({ status: 'idle' });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch Session
  const { data: session } = useQuery({
    queryKey: ['chat-session'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/chat/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!token
  });

  // SSE for Real-time status
  useEffect(() => {
    if (!session?.id || !token) return;
    const eventSource = new EventSource(`${apiUrl}/chat/status/${session.id}?token=${token}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAiStatus(data);
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [session?.id, apiUrl]);

  // Fetch History
  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: historyLoading
  } = useInfiniteQuery({
    queryKey: ['chat-history', session?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axios.get(`${apiUrl}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { sessionId: session.id, page: pageParam, limit: 20 }
      });
      return response.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
    enabled: !!session?.id
  });

  // Mutation for sending message
  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await axios.post(`${apiUrl}/chat/message`, 
        { sessionId: session.id, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['chat-history', session?.id] });
      setAiStatus({ status: 'thinking' });
      scrollToBottom();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history', session?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
      setAiStatus({ status: 'idle' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send message';
      toast.error(msg);
      setAiStatus({ status: 'idle' });
    }
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [historyData, aiStatus]);

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    mutation.mutate(input);
    setInput('');
  };

  const messages = historyData?.pages.flatMap(page => page).reverse() || [];

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col pt-[calc(var(--safe-area-inset-top))]">
      {/* Header */}
      <nav className="bg-white shadow-sm px-4 sm:px-8 py-4 flex justify-between items-center shrink-0 border-b border-gray-100 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-orange-500 transition p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-800">AI Partner</h1>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active</span>
        </div>
      </nav>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#f8f9fa]"
      >
        {hasNextPage && (
          <button 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full py-4 text-[10px] font-black text-gray-400 hover:text-orange-500 transition uppercase tracking-[0.2em]"
          >
            {isFetchingNextPage ? 'Loading history...' : 'View older messages'}
          </button>
        )}

        {messages.length === 0 && !historyLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-orange-100">🤖</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Hello, runner!</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto font-medium leading-relaxed">
              I'm your dedicated AI Partner. Ask me anything about your Strava stats or update your daily journal.
            </p>
          </div>
        )}

        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-orange-500 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`}>
              {msg.tool_logs && (
                <div className="mb-3 pb-3 border-b border-gray-50">
                  {JSON.parse(msg.tool_logs).map((log: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mb-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span className="font-bold">EXEC:</span>
                      <span>{log.tool}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-orange">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
            <div className="text-[9px] mt-1.5 font-bold uppercase tracking-widest text-gray-300 px-1">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}

        {aiStatus.status !== 'idle' && (
          <div className="flex flex-col items-start gap-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {aiStatus.status === 'thinking' ? 'AI is thinking...' : `Calling ${aiStatus.toolName}...`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <textarea
            rows={1}
            placeholder="Talk to your partner..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 rounded-2xl py-3 px-5 text-sm resize-none shadow-inner max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            className="w-12 h-12 bg-gray-900 hover:bg-black disabled:bg-gray-100 text-white rounded-2xl flex items-center justify-center transition shadow-lg shrink-0 group active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 group-hover:translate-x-0.5 transition-transform"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

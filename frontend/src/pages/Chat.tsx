import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [aiStatus, setAiStatus] = useState<{ status: string, toolName?: string }>({ status: 'idle' });
  const [streamingContent, setStreamingContent] = useState('');
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Fetch Profile & Available models
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-full'],
    queryFn: async () => {
      const profileRes = await axios.get(`${apiUrl}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const profile = profileRes.data.data;
      
      const healthyKeys = profile.geminiApiKeys.filter((k: any) => k.status === 'HEALTHY');
      const allModels: any[] = [];
      const seenModels = new Set();

      for (const key of healthyKeys) {
        try {
          const modelsRes = await axios.get(`${apiUrl}/user/gemini-key/${key.id}/models`, { headers: { Authorization: `Bearer ${token}` } });
          for (const m of modelsRes.data.data) {
            if (!seenModels.has(m.name)) {
              seenModels.add(m.name);
              allModels.push(m);
            }
          }
        } catch (e) {}
      }
      return { profile, models: allModels };
    },
    enabled: !!token
  });

  useEffect(() => {
    if (profileData?.profile?.selected_model) {
      setSelectedModel(profileData.profile.selected_model);
    }
  }, [profileData?.profile?.selected_model]);

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
  }, [session?.id, apiUrl, token]);

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

  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    const userMessage = input;
    setInput('');
    setOptimisticUserMessage(userMessage);
    setIsSending(true);
    setStreamingContent('');
    setAiStatus({ status: 'thinking' });
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          sessionId: session.id, 
          message: userMessage,
          model: selectedModel 
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No reader available');

      let done = false;
      let accumulatedContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkValue = decoder.decode(value);
          accumulatedContent += chunkValue;
          setStreamingContent(accumulatedContent);
        }
      }

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['chat-history', session?.id] });
        setOptimisticUserMessage(null);
        setStreamingContent('');
        setAiStatus({ status: 'idle' });
      }, 300);

    } catch (error: any) {
      toast.error(error.message);
      setAiStatus({ status: 'idle' });
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom(streamingContent ? 'auto' : 'smooth');
  }, [historyData, aiStatus, streamingContent, optimisticUserMessage]);

  const messages = historyData?.pages.flatMap(page => page).reverse() || [];

  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex flex-col pt-[calc(var(--safe-area-inset-top))] transition-colors duration-300">
      <style>{`
        @keyframes subtleUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-message {
          animation: subtleUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        /* Manual Markdown Styling */
        .prose-manual h1 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.75rem; color: inherit; }
        .prose-manual h2 { font-size: 1.1rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: inherit; }
        .prose-manual p { margin-bottom: 0.75rem; line-height: 1.6; }
        .prose-manual ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .prose-manual ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .prose-manual li { margin-bottom: 0.35rem; }
        .prose-manual code { background: rgba(249, 115, 22, 0.1); color: #f97316; padding: 0.15rem 0.3rem; border-radius: 0.375rem; font-size: 0.85em; font-family: ui-monospace, monospace; }
        .dark .prose-manual code { background: rgba(249, 115, 22, 0.2); }
        .prose-manual pre { background: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 1rem 0; font-size: 0.85em; border: 1px solid rgba(255,255,255,0.05); }
        .prose-manual pre code { background: transparent; color: inherit; padding: 0; border-radius: 0; }
        .prose-manual a { color: #f97316; text-decoration: underline; font-weight: 600; }
        .prose-manual table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9em; }
        .prose-manual th, .prose-manual td { border: 1px solid rgba(0,0,0,0.05); padding: 0.6rem; text-align: left; }
        .dark .prose-manual th, .dark .prose-manual td { border-color: rgba(255,255,255,0.05); }
        .prose-manual th { background: rgba(0,0,0,0.02); font-weight: 700; }
        .dark .prose-manual th { background: rgba(255,255,255,0.02); }
        .prose-manual blockquote { border-left: 4px solid #f97316; padding-left: 1rem; font-style: italic; margin: 1rem 0; color: rgba(0,0,0,0.6); }
        .dark .prose-manual blockquote { color: rgba(255,255,255,0.6); }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; }
      `}</style>
      
      {/* Responsive Header */}
      <nav className="bg-white/80 dark:bg-black/80 backdrop-blur-md px-3 sm:px-4 py-2 flex justify-between items-center shrink-0 border-b border-gray-100 dark:border-gray-800/50 z-20">
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <Link to="/" className="text-gray-400 hover:text-orange-500 transition-all p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none truncate">AI Partner</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shrink-0"></div>
              <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {profileData?.models && profileData.models.length > 0 && (
            <div className="relative max-w-[100px] sm:max-w-[180px]">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg pl-2 pr-6 py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-orange-500/50 transition-all cursor-pointer truncate"
              >
                {profileData.models.map((m: any) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName.replace('Gemini ', '')}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-black"
      >
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
          {hasNextPage && (
            <div className="flex justify-center pb-4">
              <button 
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-full text-[9px] font-black text-gray-400 hover:text-orange-500 transition uppercase tracking-[0.2em] border border-gray-100 dark:border-gray-800"
              >
                {isFetchingNextPage ? 'Syncing history...' : 'Load previous'}
              </button>
            </div>
          )}

          {messages.length === 0 && !historyLoading && !optimisticUserMessage && (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20 rotate-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-tighter">Ready to coach</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.15em] max-w-[200px] leading-relaxed">
                Your activities are synced. Ask me about your performance or future goals.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex flex-col animate-message ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 bg-orange-500 text-white shadow-lg shadow-orange-500/10">
                  <div className="prose-manual max-w-none font-medium text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="w-full group">
                  <div className="min-w-0">
                    {msg.tool_logs && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {JSON.parse(msg.tool_logs).map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                            <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse"></span>
                            {log.tool}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose-manual max-w-none text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              <div className={`text-[8px] mt-1.5 font-black uppercase tracking-widest text-gray-300 dark:text-gray-700 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {/* Optimistic User */}
          {optimisticUserMessage && (
            <div className="flex flex-col items-end animate-message">
              <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 bg-orange-500 text-white shadow-lg shadow-orange-500/10">
                <div className="prose-manual max-w-none font-medium text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {optimisticUserMessage}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* AI Thinking/Streaming */}
          {(aiStatus.status !== 'idle' || streamingContent) && (
            <div className="w-full animate-message">
              <div className="min-w-0">
                {streamingContent ? (
                  <div className="prose-manual max-w-none text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1.5 items-center mt-2">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-duration:0.6s]"></span>
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]"></span>
                      <span className="text-[10px] ml-2 font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                        {aiStatus.status === 'thinking' ? 'Deep thinking...' : `Accessing ${aiStatus.toolName}...`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-900 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/5 rounded-2xl transition-all duration-300">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Message your partner..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent border-none focus:ring-0 py-3.5 px-4 text-sm resize-none dark:text-white transition-all font-medium placeholder-gray-400"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-12 h-12 bg-gray-900 dark:bg-orange-600 hover:scale-105 active:scale-95 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-all shadow-xl shadow-gray-900/10 dark:shadow-orange-600/20 shrink-0 group mb-[1px]"
          >
            {isSending ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 group-hover:translate-x-0.5 transition-transform"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

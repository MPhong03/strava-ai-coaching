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
  const [streamingContent, setStreamingContent] = useState(''); // Nội dung AI đang stream về
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null); // Tin nhắn user gửi đi
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

  // Fetch available models from all healthy keys
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-models'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const healthyKeys = response.data.data.geminiApiKeys.filter((k: any) => k.status === 'HEALTHY');
      
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
        } catch (e) {
          console.error(`Failed to fetch models for key ${key.id}`);
        }
      }
      return allModels;
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
    setOptimisticUserMessage(userMessage); // Hiện ngay tin nhắn user
    setIsSending(true);
    setStreamingContent(''); // Reset nội dung stream
    setAiStatus({ status: 'thinking' });
    scrollToBottom();

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
          setStreamingContent(accumulatedContent); // Cập nhật nội dung theo chunk
          scrollToBottom();
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

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [historyData, aiStatus, streamingContent, optimisticUserMessage]);

  const messages = historyData?.pages.flatMap(page => page).reverse() || [];

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-black flex flex-col pt-[calc(var(--safe-area-inset-top))] transition-colors duration-300">
      <style>{`
        @keyframes fadeInChunk {
          from { opacity: 0.5; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-chunk {
          animation: fadeInChunk 0.2s ease-out forwards;
        }
        .prose p {
          margin-bottom: 1.25rem;
        }
        .prose p:last-child {
          margin-bottom: 0;
        }
      `}</style>
      
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm px-4 sm:px-8 py-4 flex justify-between items-center shrink-0 border-b border-gray-100 dark:border-gray-800 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-orange-500 transition p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <h1 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">AI Partner</h1>
        </div>
        <div className="flex items-center gap-3">
          {profileData && profileData.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-none rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-orange-500"
            >
              {profileData.map((m: any) => (
                <option key={m.name} value={m.name}>
                  {m.displayName.replace('Gemini ', '')}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-900/20">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Active</span>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-black scroll-smooth"
      >
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
          {hasNextPage && (
            <button 
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-4 text-[10px] font-black text-gray-400 hover:text-orange-500 transition uppercase tracking-[0.2em]"
            >
              {isFetchingNextPage ? 'Loading history...' : 'View older messages'}
            </button>
          )}

          {messages.length === 0 && !historyLoading && !optimisticUserMessage && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-orange-100">🤖</div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-tighter">Hello, runner!</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto font-medium leading-relaxed uppercase tracking-widest text-[10px]">
                I'm your dedicated AI Partner. Ask me anything about your runs or context.
              </p>
            </div>
          )}

          {/* Messages from History */}
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start w-full'}`}>
              {msg.role === 'user' ? (
                // User Message Bubble
                <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl px-6 py-4 shadow-sm bg-orange-500 text-white rounded-tr-none">
                  <div className="prose prose-sm max-w-none prose-invert font-medium leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                // AI Full Width Style
                <div className="w-full border-b border-gray-50 dark:border-gray-900/50 pb-8">
                  <div className="min-w-0">
                    {msg.tool_logs && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {JSON.parse(msg.tool_logs).map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-800 text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
                            <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse"></span>
                            <span>{log.tool}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-orange font-medium leading-relaxed text-gray-800 dark:text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-[9px] mt-2 font-black uppercase tracking-widest text-gray-300 dark:text-gray-700 px-2">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {/* Optimistic User Message */}
          {optimisticUserMessage && (
            <div className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl px-6 py-4 shadow-sm bg-orange-500 text-white rounded-tr-none">
                <div className="prose prose-sm max-w-none prose-invert font-medium leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {optimisticUserMessage}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* AI Stream Content with Full Width Style */}
          {(aiStatus.status !== 'idle' || streamingContent) && (
            <div className="w-full animate-in fade-in duration-500">
              <div className="min-w-0">
                {streamingContent ? (
                  <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-orange font-medium leading-relaxed text-gray-800 dark:text-gray-200 animate-chunk">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      <span className="text-[10px] ml-2 font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {aiStatus.status === 'thinking' ? 'AI is thinking...' : `Accessing ${aiStatus.toolName}...`}
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
      <div className="p-4 sm:p-8 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl transition-all">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <textarea
            rows={1}
            placeholder="Ask your partner something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-gray-50 dark:bg-black border-none focus:ring-2 focus:ring-orange-500 rounded-2xl py-4 px-6 text-sm resize-none shadow-inner max-h-32 dark:text-white transition-all font-medium"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-14 h-14 bg-gray-900 dark:bg-orange-600 hover:scale-105 active:scale-95 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shrink-0 group"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-y-0.5 group-hover:translate-x-0.5 transition-transform"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

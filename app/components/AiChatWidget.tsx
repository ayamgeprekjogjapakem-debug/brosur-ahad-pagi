'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya Asisten AI Pustaka Brosur Ahad Pagi. Ada yang bisa saya bantu terkait materi brosur?' }
  ]);
  const [input, setInput] = useState('');
  const [loadingState, setLoadingState] = useState<'idle' | 'searching' | 'generating'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loadingState]);

  const containsArabic = (text: string) => {
    return /[\u0600-\u06FF]/.test(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingState !== 'idle') return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    
    try {
      setLoadingState('searching');
      

      setLoadingState('generating');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Gagal memproses obrolan.`);
      }
      setMessages([...newMessages, { role: 'assistant', content: data.text }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Maaf, terjadi kesalahan: ${error.message}` }]);
    } finally {
      setLoadingState('idle');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-accent text-white rounded-full shadow-xl hover:bg-accent/90 transition-all transform hover:scale-105 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        title="Tanya AI Pustaka"
      >
        <Bot size={28} />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md h-[500px] max-h-[80vh] bg-white  border border-zinc-200  rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-accent text-white p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Asisten AI Pustaka</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 ">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === 'user' 
                        ? 'bg-accent text-white rounded-tr-sm' 
                        : 'bg-white  text-zinc-800  border border-zinc-100  shadow-sm rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <div className="text-[13px] leading-[1.6] space-y-2 markdown-content" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, children, ...props }) => {
                              const textContent = React.Children.toArray(children).join('');
                              if (containsArabic(textContent)) {
                                return (
                                  <p 
                                    {...props} 
                                    className="text-[18px] leading-[1.8] text-right py-2 px-3 bg-white  rounded-xl my-2 text-zinc-900 "
                                    style={{ fontFamily: "'Scheherazade New', serif", direction: 'rtl' }}
                                  >
                                    {children}
                                  </p>
                                );
                              }
                              return <p {...props} className="mb-2 break-words">{children}</p>;
                            },
                            strong: ({ node, ...props }) => <strong {...props} className="font-bold text-zinc-900 " />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />,
                            li: ({ node, ...props }) => <li {...props} className="leading-[1.6]" />,
                            h1: ({ node, ...props }) => <h1 {...props} className="text-lg font-bold mb-2 mt-4" />,
                            h2: ({ node, ...props }) => <h2 {...props} className="text-md font-bold mb-2 mt-4" />,
                            h3: ({ node, ...props }) => <h3 {...props} className="text-sm font-bold mb-2 mt-3" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loadingState !== 'idle' && (
                <div className="flex justify-start">
                  <div className="bg-white  border border-zinc-100  rounded-2xl p-4 shadow-sm rounded-tl-sm flex items-center gap-2 text-zinc-500">
                    {loadingState === 'searching' ? (
                      <>
                        <Search size={16} className="animate-pulse text-blue-500" />
                        <span className="text-xs font-medium">Mencari brosur...</span>
                      </>
                    ) : (
                      <>
                        <Loader2 size={16} className="animate-spin text-accent" />
                        <span className="text-xs font-medium">AI menyusun jawaban...</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 bg-white  border-t border-zinc-100 ">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya seputar brosur..."
                  disabled={loadingState !== 'idle'}
                  className="w-full bg-zinc-100  text-zinc-900  rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loadingState !== 'idle'}
                  className="absolute right-2 p-2 bg-accent text-white rounded-full disabled:opacity-50 hover:bg-accent/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

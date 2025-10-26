import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const filterContent = (text: string): string => {
  return text.replace(/\{[^}]*\}/g, '');
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    setupMidnightCleanup();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/cc9e9e98-99a8-4de9-9f8a-af23c8d8c0cf');
      const data = await response.json();
      
      if (response.ok && data.messages) {
        const loadedMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      await fetch('https://functions.poehali.dev/cc9e9e98-99a8-4de9-9f8a-af23c8d8c0cf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('https://functions.poehali.dev/cc9e9e98-99a8-4de9-9f8a-af23c8d8c0cf', {
        method: 'DELETE'
      });
      setMessages([]);
      toast.success('История очищена');
    } catch (error) {
      toast.error('Не удалось очистить историю');
    }
  };

  const setupMidnightCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      clearHistory();
      setInterval(() => {
        clearHistory();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveMessage('user', input);
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/ce3d64c0-6f27-4f00-b3d7-12d604dfaf9b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput }),
      });

      const data = await response.json();

      if (response.ok) {
        const filteredContent = filterContent(data.response);
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: filteredContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        await saveMessage('assistant', filteredContent);
      } else {
        toast.error('Ошибка: ' + (data.error || 'Не удалось получить ответ'));
      }
    } catch (error) {
      toast.error('Ошибка соединения с AI');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1A1F2C] via-[#221F26] to-[#1A1F2C] flex flex-col overflow-hidden">
      <header className="border-b border-white/10 bg-[#1A1F2C]/80 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b87f5] to-[#7E69AB] flex items-center justify-center">
              <Icon name="Sparkles" size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">AI Ассистент</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={clearHistory}
          >
            <Icon name="Trash2" size={18} />
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-4 mb-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9b87f5] to-[#7E69AB] flex items-center justify-center mb-6">
                <Icon name="MessageSquare" size={36} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Чем могу помочь?
              </h2>
              <p className="text-white/60 max-w-md">
                Задайте вопрос или начните диалог с AI-ассистентом
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-4 animate-fade-in ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9b87f5] to-[#7E69AB] flex items-center justify-center flex-shrink-0">
                      <Icon name="Bot" size={16} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#9b87f5] text-white'
                        : 'bg-[#2A2F3C] text-white/90 border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="User" size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9b87f5] to-[#7E69AB] flex items-center justify-center flex-shrink-0">
                    <Icon name="Bot" size={16} className="text-white" />
                  </div>
                  <div className="bg-[#2A2F3C] border border-white/10 rounded-2xl px-5 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <div className="bg-[#2A2F3C] border border-white/10 rounded-2xl p-2 shadow-2xl">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              className="min-h-[60px] max-h-[200px] bg-transparent border-0 text-white placeholder:text-white/40 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-white/40 px-2">
                Enter — отправить, Shift+Enter — новая строка
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#8B5CF6] hover:to-[#6E59A5] text-white rounded-xl px-6 disabled:opacity-50"
              >
                {isLoading ? (
                  <Icon name="Loader2" size={18} className="animate-spin" />
                ) : (
                  <Icon name="Send" size={18} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

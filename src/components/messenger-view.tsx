
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

export function MessengerView({ chatId }: { chatId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return query(
      collection(firestore, 'rooms', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, chatId]);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !firestore) return;

    const text = inputText;
    setInputText('');

    try {
      await addDoc(collection(firestore, 'rooms', chatId, 'messages'), {
        roomId: chatId,
        userId: user.uid,
        text: text,
        authorName: user.displayName || 'Пользователь',
        authorColor: '#3b82f6',
        createdAt: serverTimestamp(),
        isDeleted: false,
        position: { x: 0, y: 0 },
        size: { width: 300, height: 100 }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full border-x bg-white">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
          {messages?.map((msg) => {
            const isMe = msg.userId === user?.uid;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1">
                   {!isMe && <span className="text-[10px] font-bold uppercase text-muted-foreground">{msg.authorName}</span>}
                </div>
                <div className={cn(
                  "max-w-[80%] p-3 rounded-2xl shadow-sm text-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-zinc-100 text-zinc-900 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 px-1">
                  {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 rounded-full bg-zinc-50 border-none"
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!inputText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

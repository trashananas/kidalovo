
'use client';

import { useParams } from 'next/navigation';
import { MessengerView } from '@/components/messenger-view';
import { useUser, useAuth } from '@/firebase';
import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function SimpleChatPage() {
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  const chatId = typeof params?.chatId === 'string' ? params.chatId : null;

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      signInAnonymously(auth);
    }
  }, [user, isUserLoading, auth]);

  if (!chatId) return <div className="p-10 text-center">ID чата не указан</div>;
  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10" /></div>;

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <header className="p-4 border-b bg-white shadow-sm flex items-center justify-between">
        <h1 className="font-bold text-lg">Чат: {chatId}</h1>
        <div className="text-xs text-muted-foreground">Внешняя интеграция</div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        <MessengerView chatId={chatId} />
      </main>
    </div>
  );
}

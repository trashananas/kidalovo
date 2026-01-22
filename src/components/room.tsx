'use client';

import { useRoom } from '@/hooks/use-room';
import { MessageCard } from './message-card';
import { MessageForm } from './message-form';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useUser } from '@/firebase';

type RoomProps = {
  roomId: string;
};

export function Room({ roomId }: RoomProps) {
  const { user, isUserLoading } = useUser();
  const { messages, loading, error } = useRoom(roomId);
  
  if (isUserLoading || (!user && !error)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Ошибка загрузки комнаты</h2>
        <p className="max-w-md text-muted-foreground">
         Не удалось загрузить данные комнаты. Возможно, вы ввели неверный код или у вас нет прав доступа. Проверьте код и попробуйте снова.
        </p>
         <Button asChild>
          <Link href="/">Вернуться на главную</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-card border-4 border-background rounded-lg">
      <header className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Вернуться на главную</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Код комнаты</h1>
          <Badge variant="secondary" className="text-base font-bold tracking-widest">
            {roomId}
          </Badge>
        </div>
      </header>
      
      <div className="absolute inset-0" id="board">
        {messages.map((msg) => (
          <MessageCard key={msg.id} message={msg} roomId={roomId} />
        ))}
        {loading && messages.length === 0 && <p className="text-center p-8 text-muted-foreground">Загрузка сообщений...</p>}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-10">
        <MessageForm roomId={roomId} />
      </div>
    </div>
  );
}

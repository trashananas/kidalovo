'use client';

import { useRoom } from '@/hooks/use-room';
import { MessageCard } from './message-card';
import { MessageForm } from './message-form';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useUser } from '@/firebase';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

type RoomProps = {
  roomId: string;
};

export function Room({ roomId }: RoomProps) {
  const { user, isUserLoading } = useUser();
  const { messages, loading, error } = useRoom(roomId);
  
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Не начинать панорамирование, если клик произошел на карточке, форме или в заголовке
    if (target.closest('.message-card') || target.closest('.message-form-container') || target.closest('.room-header')) {
      return;
    }
    setIsPanning(true);
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const newX = e.clientX - panStart.current.x;
    const newY = e.clientY - panStart.current.y;
    setPanOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  
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
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-4 border-background rounded-lg">
      <header className="absolute top-4 left-4 z-10 flex items-center gap-4 room-header">
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
      
      <div
        id="board"
        className={cn(
            'absolute inset-0',
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          id="pannable-container"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          {messages.map((msg) => (
            <MessageCard key={msg.id} message={msg} roomId={roomId} panOffset={panOffset} />
          ))}
        </div>
        {loading && messages.length === 0 && <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground">Загрузка сообщений...</p>}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-10 message-form-container">
        <MessageForm roomId={roomId} panOffset={panOffset} />
      </div>
    </div>
  );
}

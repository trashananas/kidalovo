'use client';

import { useRoom } from '@/hooks/use-room';
import { MessageCard } from './message-card';
import { MessageForm } from './message-form';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

type RoomProps = {
  roomId: string;
  roomDocId: string;
};

export function Room({ roomId, roomDocId }: RoomProps) {
  const { messages, loading, error } = useRoom(roomDocId);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-card border-4 border-background rounded-lg">
      <header className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Back to home</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Room Code</h1>
          <Badge variant="secondary" className="text-base font-bold tracking-widest">
            {roomId}
          </Badge>
        </div>
      </header>
      
      <div className="absolute inset-0" id="board">
        {messages.map((msg) => (
          <MessageCard key={msg.id} message={msg} roomId={roomId} />
        ))}
        {loading && messages.length === 0 && <p className="text-center p-8 text-muted-foreground">Loading messages...</p>}
        {error && <p className="text-center p-8 text-destructive">Error loading messages.</p>}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-10">
        <MessageForm roomId={roomId} />
      </div>
    </div>
  );
}

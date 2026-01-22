'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useTransition } from 'react';
import { GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type MessageCardProps = {
  message: Message;
  roomId: string;
};

export function MessageCard({ message, roomId }: MessageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [position, setPosition] = useState(message.position);
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.preventDefault();
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    offset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
    cardRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !cardRef.current) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;
    
    const boardRect = board.getBoundingClientRect();

    const newX = e.clientX - boardRect.left - offset.current.x;
    const newY = e.clientY - boardRect.top - offset.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !firestore) return;
    // prevent default to avoid any unwanted side-effects
    e.preventDefault();
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);
    
    // Only update if position has changed
    if (position.x === message.position.x && position.y === message.position.y) {
      return;
    }

    startTransition(async () => {
      try {
        const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await updateDoc(messageDocRef, { position });
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: `Не удалось обновить позицию: ${getErrorMessage(error)}`,
          variant: 'destructive',
        });
        // Revert position visually on error
        setPosition(message.position);
      }
    });
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'absolute w-64 rounded-lg shadow-lg transition-shadow duration-300',
        isOwner && 'cursor-grab',
        isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105',
        isPending && 'opacity-70'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} // Also handle pointer cancel
    >
      <CardContent className="relative p-4 flex gap-2">
        {isOwner && (
          <div
            className="py-1 text-muted-foreground/50 hover:text-muted-foreground touch-none"
            onPointerDown={handlePointerDown}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru }) : 'только что'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  panOffset: { x: number; y: number };
};

export function MessageCard({ message, roomId, panOffset }: MessageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [position, setPosition] = useState(message.position);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner || !dragStartRef.current || isDragging) return;
    e.stopPropagation();

    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);

    if (dx > 5 || dy > 5) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      offset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
      cardRef.current.setPointerCapture(e.pointerId);
      
      dragStartRef.current = null;
    }
  };
  
  const handleGripPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (dragStartRef.current) {
        setIsCollapsed(p => !p);
    }
    dragStartRef.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !cardRef.current) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;
    
    const boardRect = board.getBoundingClientRect();

    const newWorldX = e.clientX - boardRect.left - panOffset.x - offset.current.x;
    const newWorldY = e.clientY - boardRect.top - panOffset.y - offset.current.y;
    
    setPosition({ x: newWorldX, y: newWorldY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !firestore) return;
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);
    
    if (position.x === message.position.x && position.y === message.position.y) {
      return;
    }

    startTransition(async () => {
      try {
        const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await updateDoc(messageDocRef, { 'position.x': position.x, 'position.y': position.y });
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: `Не удалось обновить позицию: ${getErrorMessage(error)}`,
          variant: 'destructive',
        });
        setPosition(message.position);
      }
    });
  };

  return (
    <Card
      ref={cardRef}
      data-message-card="true"
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
      onPointerCancel={handlePointerUp}
    >
      <CardContent className="relative p-4 flex gap-2 items-start">
        {isOwner && (
          <div
            className="py-1 text-muted-foreground/50 hover:text-muted-foreground touch-none cursor-pointer"
            onPointerDown={handleGripPointerDown}
            onPointerMove={handleGripPointerMove}
            onPointerUp={handleGripPointerUp}
            onPointerCancel={handleGripPointerUp}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        
        {!isOwner && !isCollapsed && <div className='w-5 shrink-0'></div>}

        {!isCollapsed ? (
            <div className="flex-1">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru }) : 'только что'}
                </span>
              </div>
            </div>
        ) : (
            <div className="flex-1 text-xs text-muted-foreground italic self-center">
                Сообщение свёрнуто...
            </div>
        )}
      </CardContent>
    </Card>
  );
}

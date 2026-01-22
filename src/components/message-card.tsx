'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
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
  const cardRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    // Этот эффект синхронизирует локальную позицию с данными из Firestore.
    // Если мы в процессе перетаскивания, мы не обновляем позицию из пропсов,
    // чтобы избежать "прыжков" карточки на старое место.
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner || !dragStartRef.current || isDragging) return;
    e.stopPropagation();

    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);

    if (dx > 5 || dy > 5) {
      if (!cardRef.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      const rect = cardRef.current.getBoundingClientRect();
      dragOffset.current = {
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

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;
    
    const boardRect = board.getBoundingClientRect();

    const newWorldX = e.clientX - boardRect.left - panOffset.x - dragOffset.current.x;
    const newWorldY = e.clientY - boardRect.top - panOffset.y - dragOffset.current.y;
    
    setPosition({ x: newWorldX, y: newWorldY });
  };

  const handleCardPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !firestore) return;

    // Сначала обновляем Firestore и дожидаемся завершения
    try {
      if (position.x !== message.position.x || position.y !== message.position.y) {
        const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await updateDoc(messageDocRef, { 'position': position });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить позицию: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
      // В случае ошибки возвращаем карточку на исходную позицию
      setPosition(message.position);
    } finally {
      // Только после успешного обновления (или ошибки) завершаем перетаскивание
      setIsDragging(false);
      cardRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <Card
      ref={cardRef}
      data-message-card="true"
      className={cn(
        'absolute w-64 rounded-lg shadow-lg transition-shadow duration-300',
        isOwner && 'cursor-grab',
        isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerUp}
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

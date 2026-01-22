'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { GripVertical, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useUser,
  useFirestore,
} from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
  const [size, setSize] = useState(message.size || { width: 256, height: 128 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    if (!message.createdAt) {
      setTimeAgo('только что');
      return;
    }
    
    const update = () => {
      setTimeAgo(formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru }));
    };

    update();
    const intervalId = setInterval(update, 60000);
    
    return () => clearInterval(intervalId);
  }, [message.createdAt]);

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
    if (!isResizing) {
      setSize(message.size || { width: 256, height: 128 });
    }
  }, [message.position, message.size, isDragging, isResizing]);

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
    if (!isDragging || !isOwner || !firestore) {
      if(isDragging) {
        setIsDragging(false);
        cardRef.current?.releasePointerCapture(e.pointerId);
      }
      return;
    }
  
    cardRef.current?.releasePointerCapture(e.pointerId);
  
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
      setPosition(message.position);
    } finally {
      setIsDragging(false);
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: cardRef.current?.offsetWidth || size.width,
        height: cardRef.current?.offsetHeight || size.height
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handlePointerMoveGlobal = (e: PointerEvent) => {
      if (!isResizing || !resizeStartRef.current) return;

      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(150, resizeStartRef.current.width + dx);
      const newHeight = Math.max(100, resizeStartRef.current.height + dy);

      setSize({ width: newWidth, height: newHeight });
    };

    const handlePointerUpGlobal = async () => {
      if (!isResizing) return;
      
      if (!isOwner || !firestore) {
        setIsResizing(false);
        resizeStartRef.current = null;
        return;
      }

      const originalSize = message.size || { width: 256, height: 128 };
      if (size.width === originalSize.width && size.height === originalSize.height) {
          setIsResizing(false);
          resizeStartRef.current = null;
          return;
      }

      try {
          const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
          await updateDoc(messageDocRef, { 'size': size });
      } catch (error) {
          toast({
              title: 'Ошибка',
              description: `Не удалось обновить размер: ${getErrorMessage(error)}`,
              variant: 'destructive',
          });
          setSize(message.size || { width: 256, height: 128 });
      } finally {
        setIsResizing(false);
        resizeStartRef.current = null;
      }
    };

    if (isResizing) {
        window.addEventListener('pointermove', handlePointerMoveGlobal);
        window.addEventListener('pointerup', handlePointerUpGlobal);
        window.addEventListener('pointercancel', handlePointerUpGlobal);
    }

    return () => {
        window.removeEventListener('pointermove', handlePointerMoveGlobal);
        window.removeEventListener('pointerup', handlePointerUpGlobal);
        window.removeEventListener('pointercancel', handlePointerUpGlobal);
    };
  }, [isResizing, firestore, isOwner, message.id, roomId, size, toast, message.size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast({ title: 'Скопировано' });
    }).catch(err => {
      toast({ title: 'Ошибка', description: 'Не удалось скопировать текст.', variant: 'destructive' });
    });
  };

  return (
    <Card
      ref={cardRef}
      data-message-card="true"
      className={cn(
        'absolute rounded-lg shadow-lg transition-shadow duration-300 flex flex-col',
        isOwner && 'cursor-grab',
        isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105',
        isResizing && 'z-20',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none',
      }}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerUp}
    >
      <CardContent className="relative p-4 flex-grow overflow-y-auto">
        <div className="flex items-start gap-2">
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

            <div className="flex-1 min-w-0">
                {!isCollapsed ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Сообщение свёрнуто...
                    </div>
                )}
            </div>

            {!isCollapsed && (
              <div
                className="py-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                onClick={handleCopy}
                title="Скопировать текст"
              >
                <Copy className="h-5 w-5" />
              </div>
            )}
        </div>
        
        {!isCollapsed && (
            <div className="mt-2 text-xs text-muted-foreground pt-1 border-t">
                <span>
                  {timeAgo ? timeAgo : <>&nbsp;</>}
                </span>
            </div>
        )}
      </CardContent>

       {isOwner && (
        <div
          data-resize-handle="true"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20 hover:bg-primary/50 transition-colors rounded-br-lg"
          onPointerDown={handleResizePointerDown}
        />
      )}
    </Card>
  );
}

'use client';

import type { Message, MessageClassification } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useTransition } from 'react';
import { updateMessagePosition } from '@/lib/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info, AlertTriangle, MessageCircle, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type MessageCardProps = {
  message: Message;
  roomId: string;
};

const classificationIcons: Record<MessageClassification, React.ElementType> = {
  adds_information: Info,
  contradicts: AlertTriangle,
  neutral: MessageCircle,
};

const classificationColors: Record<MessageClassification, string> = {
  adds_information: 'text-blue-500',
  contradicts: 'text-red-500',
  neutral: 'text-gray-400',
};

const classificationLabels: Record<MessageClassification, string> = {
  adds_information: 'Adds Information',
  contradicts: 'Contradicts',
  neutral: 'Neutral',
};


export function MessageCard({ message, roomId }: MessageCardProps) {
  const [position, setPosition] = useState(message.position);
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (!isDragging || !cardRef.current) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;
    
    const boardRect = board.getBoundingClientRect();

    const newX = e.clientX - boardRect.left - offset.current.x;
    const newY = e.clientY - boardRect.top - offset.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);
    
    startTransition(() => {
        updateMessagePosition(roomId, message.id, position);
    });
  };

  const ClassificationIcon = message.classification ? classificationIcons[message.classification] : null;

  return (
    <Card
      ref={cardRef}
      className={cn(
        'absolute w-64 cursor-grab rounded-lg shadow-lg transition-shadow duration-300',
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
    >
      <CardContent className="relative p-4 flex gap-2">
        <div
          className="py-1 text-muted-foreground/50 hover:text-muted-foreground"
          onPointerDown={handlePointerDown}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'just now'}
            </span>
            {ClassificationIcon && message.classification && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger>
                    <ClassificationIcon className={cn('h-4 w-4', classificationColors[message.classification])} />
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="max-w-xs">
                      <p className='font-bold'>{classificationLabels[message.classification]}</p>
                      <p>{message.reason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

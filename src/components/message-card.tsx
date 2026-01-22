'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';

const Spoiler = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={cn(
        'inline-block rounded px-1 cursor-pointer transition-colors',
        isVisible
          ? 'bg-transparent'
          : 'bg-muted-foreground/30 hover:bg-muted-foreground/20'
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      <span className={cn(isVisible ? 'opacity-100' : 'opacity-0')}>
        {children}
      </span>
    </span>
  );
};

const renderFormattedText = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(
    '(@(.*?)\@\{(.*?)\})' + // 1, 2, 3: @text@{link}
      '|(\\*(.*?)\\*)' + // 4, 5: *bold*
      '|(\\\\(.*?)\\\\)' + // 6, 7: \italic\
      '|(_(.*?)_)' + // 8, 9: _underline_
      '|(\\$([^$]*?)\\$)' + // 10, 11: $strikethrough$
      '|(#(.*?)#)' + // 12, 13: #spoiler#
      '|((?:https?://|www\\.)[^\\s]+)' + // 14: autolink
      '|(\\s<3\\s)', // 15: <3 heart
    'g'
  );

  let match;
  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    const fullMatch = match[0];

    // Add text before the match
    if (startIndex > lastIndex) {
      nodes.push(text.substring(lastIndex, startIndex));
    }

    // Handle link: @text@{url}
    if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push(
        <a
          key={lastIndex}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {match[2]}
        </a>
      );
    }
    // Handle bold: *text*
    else if (match[5] !== undefined) {
      nodes.push(<strong key={lastIndex}>{match[5]}</strong>);
    }
    // Handle italic: \text\
    else if (match[7] !== undefined) {
      nodes.push(<em key={lastIndex}>{match[7]}</em>);
    }
    // Handle underline: _text_
    else if (match[9] !== undefined) {
      nodes.push(<u key={lastIndex}>{match[9]}</u>);
    }
    // Handle strikethrough: $text$
    else if (match[11] !== undefined) {
      nodes.push(<s key={lastIndex}>{match[11]}</s>);
    }
    // Handle spoiler: #text#
    else if (match[13] !== undefined) {
      nodes.push(<Spoiler key={lastIndex}>{match[13]}</Spoiler>);
    }
    // Handle autolink
    else if (match[14] !== undefined) {
      const url = fullMatch.startsWith('www.')
        ? `http://${fullMatch}`
        : fullMatch;
      nodes.push(
        <a
          key={lastIndex}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </a>
      );
    }
    // Handle heart
    else if (match[15] !== undefined) {
      nodes.push(<span key={lastIndex}> ❤️ </span>);
    }

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
};

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isOwner = user?.uid === message.userId;

  // Effect for updating the 'time ago' string
  useEffect(() => {
    if (!message.createdAt) {
      setTimeAgo('только что');
      return;
    }

    const update = () => {
      setTimeAgo(
        formatDistanceToNow(message.createdAt.toDate(), {
          addSuffix: true,
          locale: ru,
        })
      );
    };

    update();
    const intervalId = setInterval(update, 60000);

    return () => clearInterval(intervalId);
  }, [message.createdAt]);

  // Effect for syncing position from props
  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);

  // Effect for syncing size from props
  useEffect(() => {
    if (!isResizing) {
      setSize(message.size || { width: 256, height: 128 });
    }
  }, [message.size, isResizing]);

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
      setIsCollapsed((p) => !p);
    }
    dragStartRef.current = null;
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner) return;
    e.preventDefault();
    const board = document.getElementById('board');
    if (!board) return;

    const boardRect = board.getBoundingClientRect();

    const newWorldX =
      e.clientX - boardRect.left - panOffset.x - dragOffset.current.x;
    const newWorldY =
      e.clientY - boardRect.top - panOffset.y - dragOffset.current.y;

    setPosition({ x: newWorldX, y: newWorldY });
  };

  const handleCardPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner || !firestore) {
      if (isDragging) {
        setIsDragging(false);
        cardRef.current?.releasePointerCapture(e.pointerId);
      }
      return;
    }

    cardRef.current?.releasePointerCapture(e.pointerId);

    try {
      if (
        position.x !== message.position.x ||
        position.y !== message.position.y
      ) {
        const messageDocRef = doc(
          firestore,
          'rooms',
          roomId,
          'messages',
          message.id
        );
        await updateDoc(messageDocRef, { position: position });
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
      height: cardRef.current?.offsetHeight || size.height,
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
      if (
        size.width === originalSize.width &&
        size.height === originalSize.height
      ) {
        setIsResizing(false);
        resizeStartRef.current = null;
        return;
      }

      try {
        const messageDocRef = doc(
          firestore,
          'rooms',
          roomId,
          'messages',
          message.id
        );
        await updateDoc(messageDocRef, { size: size });
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
  }, [
    isResizing,
    firestore,
    isOwner,
    message.id,
    roomId,
    size,
    toast,
    message.size,
  ]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message.text)
      .then(() => {
        toast({ title: 'Скопировано' });
      })
      .catch((err) => {
        toast({
          title: 'Ошибка',
          description: 'Не удалось скопировать текст.',
          variant: 'destructive',
        });
      });
  };

  const handleDelete = async () => {
    if (!isOwner || !firestore) return;

    try {
      const messageDocRef = doc(
        firestore,
        'rooms',
        roomId,
        'messages',
        message.id
      );
      await deleteDoc(messageDocRef);
      toast({ title: 'Сообщение удалено' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить сообщение: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };


  return (
    <>
      <Card
        ref={cardRef}
        data-message-card="true"
        className={cn(
          'absolute rounded-lg shadow-lg transition-shadow duration-300 flex flex-col',
          isOwner && 'cursor-grab',
          isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105',
          isResizing && 'z-20'
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
        <div className="relative p-4 flex flex-col gap-2 flex-grow overflow-y-auto">
          <div className="flex items-start gap-2 h-full">
            {isOwner && (
              <div className="flex flex-col gap-2">
                <div
                  className="p-1 text-muted-foreground/50 hover:text-muted-foreground touch-none cursor-pointer"
                  onPointerDown={handleGripPointerDown}
                  onPointerMove={handleGripPointerMove}
                  onPointerUp={handleGripPointerUp}
                  onPointerCancel={handleGripPointerUp}
                  title="Перетащить / Свернуть"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
                 <div
                  className="p-1 text-muted-foreground/50 hover:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  title="Удалить"
                >
                  <Trash2 className="h-5 w-5" />
                </div>
              </div>
            )}

            {!isOwner && !isCollapsed && <div className="w-9 shrink-0"></div>}

            <div className="flex-1 min-w-0 h-full overflow-y-auto">
              {!isCollapsed ? (
                message.text.trim() === '<3' ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-5xl">❤️</span>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {renderFormattedText(message.text)}
                  </p>
                )
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
          {!isCollapsed && timeAgo && (
            <div className="mt-auto text-xs text-muted-foreground pt-1 border-t shrink-0">
              <span>{timeAgo}</span>
            </div>
          )}
        </div>


        {isOwner && (
          <div
            data-resize-handle="true"
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20 hover:bg-primary/50 transition-colors rounded-br-lg"
            onPointerDown={handleResizePointerDown}
          />
        )}
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя будет отменить. Сообщение будет удалено
              навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
               <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

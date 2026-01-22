'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { GripVertical, Copy, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useUser,
  useFirestore,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

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
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    if (message.createdAt) {
      setTimeAgo(formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru }));
    } else {
      setTimeAgo('только что');
    }
  }, [message.createdAt]);

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
    if (!isResizing) {
      setSize(message.size || { width: 256, height: 128 });
    }
  }, [message.position, message.size, isDragging, isResizing]);
  
  useEffect(() => {
    if (!isEditing) {
      setEditText(message.text);
    }
  }, [message.text, isEditing]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner || isEditing) return;
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
        if (!isEditing) {
            setIsCollapsed(p => !p);
        }
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

  const handleEdit = () => {
    if (!isOwner) return;
    setEditText(message.text);
    setIsEditing(true);
    setIsCollapsed(false);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text);
  };

  const handleSaveEdit = () => {
    if (!isOwner || !firestore) return;
    if (editText.trim() === '') {
      toast({ title: 'Ошибка', description: 'Сообщение не может быть пустым.', variant: 'destructive' });
      return;
    }
    if (editText === message.text) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
    const updatedData = { text: editText };

    updateDocumentNonBlocking(messageDocRef, updatedData);
    setIsSaving(false);
    setIsEditing(false);
    toast({ title: 'Сохранено' });
  };

  const handleDelete = () => {
    if (!isOwner || !firestore) return;
    
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);

    deleteDocumentNonBlocking(messageDocRef);
  };

  const cardComponent = (
    <Card
      ref={cardRef}
      data-message-card="true"
      className={cn(
        'absolute rounded-lg shadow-lg transition-shadow duration-300 flex flex-col',
        isOwner && !isEditing && 'cursor-grab',
        isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105',
        isResizing && 'z-20',
        (isSaving || isDeleting) && 'opacity-70',
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
      <CardContent className="relative p-4 flex gap-2 items-start flex-grow min-h-0">
        {isOwner && !isEditing && (
          <div
            className="sticky top-0 py-1 text-muted-foreground/50 hover:text-muted-foreground touch-none cursor-pointer"
            onPointerDown={handleGripPointerDown}
            onPointerMove={handleGripPointerMove}
            onPointerUp={handleGripPointerUp}
            onPointerCancel={handleGripPointerUp}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        
        {!isOwner && !isCollapsed && <div className='w-5 shrink-0'></div>}

        <div className={cn("flex-1 flex flex-col min-h-0", isEditing && "w-full")}>
            {isEditing ? (
                 <div className="space-y-2 flex flex-col h-full">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-grow min-h-[60px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEdit();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Отмена</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
            ) : (
              <>
                {!isCollapsed ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-grow overflow-y-auto pr-2">
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground pt-1 border-t">
                            <span>
                              {timeAgo ? timeAgo : <>&nbsp;</>}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 text-xs text-muted-foreground italic self-center">
                        Сообщение свёрнуто...
                    </div>
                )}
              </>
            )}
        </div>

        {!isCollapsed && !isEditing && (
          <div
            className="sticky top-0 py-1 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
            onClick={handleCopy}
            title="Скопировать текст"
          >
            <Copy className="h-5 w-5" />
          </div>
        )}
      </CardContent>

       {isOwner && !isEditing && (
        <div
          data-resize-handle="true"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20 hover:bg-primary/50 transition-colors rounded-br-lg"
          onPointerDown={handleResizePointerDown}
        />
      )}
    </Card>
  );

  if (!isOwner) {
    return cardComponent;
  }
  
  return (
     <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <ContextMenu>
        <ContextMenuTrigger disabled={isEditing}>
          {cardComponent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleEdit} disabled={isEditing}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Изменить</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Скопировать текст</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Удалить</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить. Сообщение будет удалено навсегда.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

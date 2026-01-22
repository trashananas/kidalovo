'use client';

import type { Message } from '@/types';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useTransition } from 'react';
import { GripVertical, Copy, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [isPending, startTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = user?.uid === message.userId;

  useEffect(() => {
    if (!isDragging) {
      setPosition(message.position);
    }
  }, [message.position, isDragging]);
  
  useEffect(() => {
    if (!isEditing) {
      setEditText(message.text);
    }
  }, [message.text, isEditing]);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation(); // Остановить панорамирование доски
    if (!cardRef.current) return;
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };

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

    const newWorldX = e.clientX - boardRect.left - panOffset.x - offset.current.x;
    const newWorldY = e.clientY - boardRect.top - panOffset.y - offset.current.y;
    
    setPosition({ x: newWorldX, y: newWorldY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !isOwner) return;
    e.preventDefault();
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);

    const distanceMoved = Math.sqrt(
      Math.pow(e.clientX - dragStartPos.current.x, 2) +
      Math.pow(e.clientY - dragStartPos.current.y, 2)
    );

    if (distanceMoved < 5) { // Это клик
      if (!isEditing) {
        setIsCollapsed(prev => !prev);
      }
      setPosition(message.position); // Сбросить любое незначительное перетаскивание
      return;
    }
    
    if (!firestore) return;
    
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast({ title: 'Скопировано', description: 'Текст сообщения скопирован в буфер обмена.' });
    }).catch(err => {
      toast({ title: 'Ошибка', description: 'Не удалось скопировать текст.', variant: 'destructive' });
    });
  };

  const handleEdit = () => {
    if (!isOwner) return;
    setEditText(message.text);
    setIsEditing(true);
    setIsCollapsed(false); // Убедиться, что карточка развернута для редактирования
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text); // Сбросить текст
  };

  const handleSaveEdit = async () => {
    if (!isOwner || !firestore) return;
    if (editText.trim() === '') {
      toast({ title: 'Ошибка', description: 'Сообщение не может быть пустым.', variant: 'destructive' });
      return;
    }
    if (editText === message.text) {
      setIsEditing(false);
      return;
    }
    
    startTransition(async () => {
      try {
        const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await updateDoc(messageDocRef, { text: editText });
        setIsEditing(false);
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: `Не удалось сохранить изменения: ${getErrorMessage(error)}`,
          variant: 'destructive',
        });
      }
    });
  };

  const handleDelete = async () => {
    if (!isOwner || !firestore) return;
    
    startTransition(async () => {
      try {
        const messageDocRef = doc(firestore, 'rooms', roomId, 'messages', message.id);
        await deleteDoc(messageDocRef);
        setShowDeleteConfirm(false);
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: `Не удалось удалить сообщение: ${getErrorMessage(error)}`,
          variant: 'destructive',
        });
      }
    });
  };
  
  const cardComponent = (
    <Card
      ref={cardRef}
      onContextMenu={isOwner ? (e) => e.preventDefault() : undefined}
      className={cn(
        'absolute w-64 rounded-lg shadow-lg transition-shadow duration-300 message-card',
        isOwner && !isEditing && 'cursor-grab',
        isDragging && 'cursor-grabbing shadow-2xl z-20 scale-105',
        (isPending || isDragging) && 'opacity-70',
        isCollapsed && !isEditing && 'h-auto'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      onPointerMove={isEditing ? undefined : handlePointerMove}
      onPointerUp={isEditing ? undefined : handlePointerUp}
      onPointerCancel={isEditing ? undefined : handlePointerUp}
    >
      <CardContent className="relative p-4 flex gap-2">
        {isOwner && !isEditing && (
          <div
            className="py-1 text-muted-foreground/50 hover:text-muted-foreground touch-none cursor-pointer"
            onPointerDown={handleGripPointerDown}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {isEditing ? (
             <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[80px]"
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
                <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                  {isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!isCollapsed && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.text}</p>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: ru }) : 'только что'}
                </span>
                 {isCollapsed && <span className="text-xs italic">Свернуто...</span>}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isOwner) {
    return cardComponent;
  }
  
  return (
     <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {cardComponent}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleEdit} disabled={isEditing}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Изменить</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Скопировать текст</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Удалить</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить. Сообщение будет удалено навсегда.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

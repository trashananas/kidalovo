'use client';

import { useRoom } from '@/hooks/use-room';
import { MessageCard } from './message-card';
import { MessageForm } from './message-form';
import { Badge } from './ui/badge';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Expand,
  Minimize,
  Pen,
  MousePointer2,
} from 'lucide-react';
import { Button } from './ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useState, useRef, useEffect } from 'react';
import { cn, getErrorMessage } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore';
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
import { useToast } from '@/hooks/use-toast';
import useIsMobile from '@/hooks/use-is-mobile';
import { DrawingToolbar } from './drawing-toolbar';
import { DrawingCanvas } from './drawing-canvas';
import type { DrawingShape } from '@/types';

type RoomProps = {
  roomId: string;
};

export function Room({ roomId }: RoomProps) {
  const { user, isUserLoading } = useUser();
  const { messages, drawings, loading, error } = useRoom(roomId);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingShape | 'pan' | 'eraser' | 'select'>('pan');
  const [drawColor, setDrawColor] = useState('#EF4444'); // Tailwind red-500
  const [strokeWidth, setStrokeWidth] = useState(4);

  const roomRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'rooms', roomId);
  }, [firestore, roomId]);

  useDoc(roomRef);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('portrait-primary').catch(() => {
            // Ignore errors, not critical if locking fails
          });
        }
      } catch (err) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось перейти в полноэкранный режим.',
          variant: 'destructive',
        });
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const handleDeleteRoom = async () => {
    if (!firestore || !user || !roomRef) return;

    setIsDeleting(true);

    try {
      const messagesCollectionRef = collection(
        firestore,
        'rooms',
        roomId,
        'messages'
      );
      const drawingsCollectionRef = collection(firestore, 'rooms', roomId, 'drawings');

      const [messagesSnapshot, drawingsSnapshot] = await Promise.all([
        getDocs(messagesCollectionRef),
        getDocs(drawingsCollectionRef),
      ]);

      const batch = writeBatch(firestore);

      messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      drawingsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      batch.delete(roomRef);

      await batch.commit();

      toast({
        title: 'Комната удалена',
        description: `Комната ${roomId} и всё её содержимое были удалены.`,
      });

      router.push('/');
    } catch (error) {
      console.error('Ошибка при удалении комнаты: ', error);
      toast({
        title: 'Ошибка удаления',
        description:
          'Удалить комнату может только последний участник. ' +
          getErrorMessage(error),
        variant: 'destructive',
      });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const canPan = !isDrawing || drawingTool === 'pan';
    if (!canPan) return;

    // Check if the event target is the board itself, not something on the canvas or a message.
    const target = e.target as HTMLElement;
    if (target.closest('[data-drawing-canvas="true"]') || target.closest('[data-message-card="true"]') || target.closest('[data-resize-handle="true"]')) {
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

  const toggleDrawing = () => {
    const newIsDrawing = !isDrawing;
    setIsDrawing(newIsDrawing);
    if (newIsDrawing) {
        setDrawingTool('path');
    } else {
        setDrawingTool('pan');
    }
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
        <h2 className="text-2xl font-bold text-destructive">
          Ошибка загрузки комнаты
        </h2>
        <p className="max-w-md text-muted-foreground">
          Не удалось загрузить данные комнаты. Возможно, вы ввели неверный код
          или у вас нет прав доступа. Проверьте код и попробуйте снова.
        </p>
        <Button asChild>
          <Link href="/">Вернуться на главную</Link>
        </Button>
      </div>
    );
  }
  
  const boardCursorClass = () => {
    const canPan = !isDrawing || drawingTool === 'pan';
    if (canPan) {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    // Cursors for drawing tools are handled by the canvas itself
    return '';
  }


  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-4 border-background rounded-lg">
      <header className="absolute top-4 left-4 z-20 flex items-center gap-2 md:gap-4 room-header">
        <Button asChild variant="outline" size="icon">
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Вернуться на главную</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold hidden sm:block">Код комнаты</h1>
          <Badge
            variant="secondary"
            className="text-base font-bold tracking-widest"
          >
            {roomId}
          </Badge>
        </div>

        <div className="flex items-center gap-2 rounded-full border bg-card p-1 shadow-sm">
          <Button
            variant={isDrawing ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleDrawing}
            title="Режим рисования"
          >
            {isDrawing ? <MousePointer2 /> : <Pen />}
          </Button>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Выйти' : 'Во весь экран'}
            >
              {isFullscreen ? <Minimize /> : <Expand />}
            </Button>
          )}
          {user && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive-foreground bg-destructive/80 hover:bg-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
                title="Удалить комнату (только для последнего участника)"
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие навсегда удалит комнату и всё её содержимое
                      (сообщения и рисунки). Действие сработает, только если вы
                      последний участник в комнате.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Отмена
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteRoom}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Удаление...' : 'Удалить'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </header>

      {isDrawing && (
        <DrawingToolbar
          color={drawColor}
          setColor={setDrawColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          drawingTool={drawingTool}
          setDrawingTool={setDrawingTool}
        />
      )}

      <div
        id="board"
        className={cn(
          'absolute inset-0',
           boardCursorClass()
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          id="pannable-container"
          className="absolute inset-0"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              roomId={roomId}
              panOffset={panOffset}
            />
          ))}
        </div>
        
        <DrawingCanvas
          roomId={roomId}
          isDrawing={isDrawing}
          color={drawColor}
          strokeWidth={strokeWidth}
          drawings={drawings}
          drawingTool={drawingTool}
          setDrawingTool={setDrawingTool}
          panOffset={panOffset}
          className="z-10"
        />

        {loading && messages.length === 0 && (
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground">
            Загрузка сообщений...
          </p>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-20 message-form-container">
        <MessageForm roomId={roomId} panOffset={panOffset} />
      </div>
    </div>
  );
}

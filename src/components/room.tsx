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
  MousePointer2,
  Lock,
  KeyRound,
  Feather,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from './ui/button';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DrawingShape } from '@/types';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type RoomProps = {
  roomId: string;
};

export function Room({ roomId }: RoomProps) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Password verification state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const isAnanas = user?.displayName === 'Ananas';

  // Ensure user is at least anonymous
  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  // Firestore room doc to check for password and membership
  const roomDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'rooms', roomId);
  }, [firestore, roomId]);
  
  const { data: roomData, isLoading: isRoomDataLoading } = useDoc(roomDocRef);

  // Hook for messages/drawings - only active if password verified or not needed
  const { messages, drawings, loading, error } = useRoom(roomId, isPasswordVerified);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasInitiallyCentered = useRef(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingShape | 'pan' | 'eraser' | 'select'>('pan');
  const [drawColor, setDrawColor] = useState('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(4);

  const isCurrentUserRoomOwner = roomData?.creatorId === user?.uid || isAnanas;

  // Handle password check
  useEffect(() => {
    if (roomData && !isRoomDataLoading && user) {
      if (isAnanas) {
        setIsPasswordVerified(true);
        return;
      }
      if (!roomData.password) {
        setIsPasswordVerified(true);
        return;
      }
      if (!user.isAnonymous && roomData.members && roomData.members[user.uid]) {
        setIsPasswordVerified(true);
        return;
      }
      if (roomData.creatorId === user.uid) {
        setIsPasswordVerified(true);
        return;
      }
      const storedPassword = sessionStorage.getItem(`room_pwd_${roomId}`);
      if (storedPassword === roomData.password) {
        setIsPasswordVerified(true);
      }
    }
  }, [roomData, isRoomDataLoading, roomId, user, isAnanas]);

  // Automatic centering on first message
  useEffect(() => {
    if (!loading && messages.length > 0 && !hasInitiallyCentered.current && typeof window !== 'undefined') {
      const sorted = [...messages].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });
      const firstMsg = sorted[0];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const msgWidth = firstMsg.size?.width || 320;
      const msgHeight = firstMsg.size?.height || 140;

      setPanOffset({
        x: centerX - (firstMsg.position.x + msgWidth / 2),
        y: centerY - (firstMsg.position.y + msgHeight / 2),
      });
      
      hasInitiallyCentered.current = true;
    }
  }, [loading, messages]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomData && passwordInput === roomData.password) {
      setIsPasswordVerified(true);
      sessionStorage.setItem(`room_pwd_${roomId}`, passwordInput);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      toast({
        title: 'Ошибка',
        description: 'Неверный пароль.',
        variant: 'destructive',
      });
    }
  };

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
          await screen.orientation.lock('portrait-primary').catch(() => {});
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
    if (!firestore || !user || !roomDocRef) return;
    setIsDeleting(true);
    try {
      const messagesCollectionRef = collection(firestore, 'rooms', roomId, 'messages');
      const drawingsCollectionRef = collection(firestore, 'rooms', roomId, 'drawings');
      const [messagesSnapshot, drawingsSnapshot] = await Promise.all([
        getDocs(messagesCollectionRef),
        getDocs(drawingsCollectionRef),
      ]);
      const batch = writeBatch(firestore);
      messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      drawingsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(roomDocRef);
      await batch.commit();
      toast({ title: 'Комната удалена' });
      router.push('/');
    } catch (error) {
      toast({
        title: 'Ошибка удаления',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const canPan = !isDrawing || drawingTool === 'pan';
    if (!canPan) return;
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
    setPanOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleDrawing = () => {
    const newIsDrawing = !isDrawing;
    setIsDrawing(newIsDrawing);
    setDrawingTool(newIsDrawing ? 'path' : 'pan');
  };

  const handleResetView = () => {
    if (messages.length > 0) {
      const sorted = [...messages].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });
      const firstMsg = sorted[0];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const msgWidth = firstMsg.size?.width || 320;
      const msgHeight = firstMsg.size?.height || 140;

      setPanOffset({
        x: centerX - (firstMsg.position.x + msgWidth / 2),
        y: centerY - (firstMsg.position.y + msgHeight / 2),
      });
      
      toast({ title: 'Возврат к первому сообщению' });
    } else {
      setPanOffset({ x: 0, y: 0 });
      toast({ title: 'Вид сброшен к началу' });
    }
  };

  if (isUserLoading || isRoomDataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!isPasswordVerified && roomData?.password) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Приватная комната</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Для входа в комнату <b>{roomId}</b> требуется пароль.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Введите пароль"
                    className={cn("pl-10 pr-10", passwordError && "border-destructive ring-destructive")}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                 <Button type="button" variant="outline" className="flex-1" asChild>
                    <Link href="/">Назад</Link>
                 </Button>
                 <Button type="submit" className="flex-1">Войти</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Ошибка загрузки комнаты</h2>
        <p className="max-w-md text-muted-foreground">Проверьте код и попробуйте снова.</p>
        <Button asChild><Link href="/">На главную</Link></Button>
      </div>
    );
  }

  const boardCursorClass = () => {
    const canPan = !isDrawing || drawingTool === 'pan';
    if (canPan) return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    return '';
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-4 border-background rounded-lg">
      <header className="absolute top-4 left-4 z-20 flex items-center gap-2 md:gap-4 room-header">
        <Button asChild variant="outline" size="icon">
          <Link href="/"><ArrowLeft /><span className="sr-only">Назад</span></Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
             <Badge variant="secondary" className="text-base font-bold tracking-widest">{roomId}</Badge>
             {roomData?.password && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border bg-card p-1 shadow-sm">
          <Button variant={isDrawing ? 'secondary' : 'ghost'} size="icon" onClick={toggleDrawing} title="Рисование">
            {isDrawing ? <MousePointer2 /> : <Feather />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetView} title="К первому сообщению">
            <Target />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? 'Выйти' : 'Во весь экран'}>
              {isFullscreen ? <Minimize /> : <Expand />}
            </Button>
          )}
          {user && (
            <>
              <Button variant="ghost" size="icon" className="text-destructive-foreground bg-destructive/80 hover:bg-destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting} title="Удалить">
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить комнату?</AlertDialogTitle>
                    <AlertDialogDescription>Это навсегда удалит всё содержимое. Вы должны быть последним участником.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRoom} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
        <DrawingToolbar color={drawColor} setColor={setDrawColor} strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} drawingTool={drawingTool} setDrawingTool={setDrawingTool} />
      )}

      <div id="board" className={cn('absolute inset-0', boardCursorClass())} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        <div id="pannable-container" className="absolute inset-0" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
          {messages.map((msg) => (
            <MessageCard key={msg.id} message={msg} roomId={roomId} panOffset={panOffset} isRoomOwner={isCurrentUserRoomOwner} />
          ))}
        </div>
        <DrawingCanvas roomId={roomId} isDrawing={isDrawing} color={drawColor} strokeWidth={strokeWidth} drawings={drawings} drawingTool={drawingTool} setDrawingTool={setDrawingTool} panOffset={panOffset} className="z-10" />
        {loading && messages.length === 0 && <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground">Загрузка...</p>}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-20 message-form-container">
        <MessageForm roomId={roomId} panOffset={panOffset} />
      </div>
    </div>
  );
}
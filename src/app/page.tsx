'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Unlock, Plus, LogOut, Info, Eye, EyeOff, ShieldCheck, ShieldAlert, Settings, Code } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { generateRoomCode, getErrorMessage } from '@/lib/utils';
import { UserGuide } from '@/components/user-guide';
import { KidalovoLogo } from '@/components/kidalovo-logo';
import { Separator } from '@/components/ui/separator';
import { AuthModal } from '@/components/auth-modal';
import { PineappleBadge } from '@/components/pineapple-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { RegistrationSuggestion } from '@/components/registration-suggestion';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const joinCodeRef = useRef<HTMLInputElement>(null);

  const [customCode, setCustomCode] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [onlyAuthorized, setOnlyAuthorized] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAnanas = user?.email === 'ananas@kidalovo.internal';

  const performSignIn = async () => {
    if (!auth || user || isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.warn('Anonymous sign-in error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      performSignIn();
    }
  }, [user, isUserLoading, auth]);

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    
    let currentUser = user;
    if (!currentUser && auth) {
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      } catch (err) {
        toast({ title: 'Ошибка', description: 'Не удалось авторизоваться.', variant: 'destructive' });
        setIsCreatingRoom(false);
        return;
      }
    }

    if (!firestore || !currentUser) {
      toast({ title: 'Ошибка', description: 'Сервисы еще не готовы.', variant: 'destructive' });
      setIsCreatingRoom(false);
      return;
    }

    const finalCode = customCode.trim().toUpperCase() || generateRoomCode();
    
    if (customCode.trim() && currentUser.isAnonymous) {
      toast({ title: 'Доступ запрещен', description: 'Кастомные коды доступны только зарегистрированным.', variant: 'destructive' });
      setIsCreatingRoom(false);
      return;
    }

    const roomRef = doc(firestore, 'rooms', finalCode);

    try {
      const docSnap = await getDoc(roomRef);

      if (docSnap.exists()) {
        toast({ title: 'Ошибка', description: `Код ${finalCode} уже занят.`, variant: 'destructive' });
        setIsCreatingRoom(false);
        return;
      }

      const roomData: any = {
        code: finalCode,
        createdAt: serverTimestamp(),
        creatorId: currentUser.uid,
        onlyAuthorized: onlyAuthorized,
        members: {
          [currentUser.uid]: {
            role: 'owner',
            name: currentUser.displayName || (currentUser.isAnonymous ? 'Аноним' : 'Пользователь')
          },
        },
      };

      if (isPrivate && roomPassword.trim()) {
        roomData.password = roomPassword.trim();
      }

      await setDoc(roomRef, roomData);
      
      if (onlyAuthorized) {
        const messagesCol = collection(firestore, 'rooms', finalCode, 'messages');
        await addDoc(messagesCol, {
          type: 'audit',
          text: 'SYSTEM_AUDIT_LOG',
          userId: 'system',
          createdAt: serverTimestamp(),
          position: { x: 0, y: 0 },
          size: { width: 320, height: 200 }
        });
      }

      if (roomData.password) {
        sessionStorage.setItem(`room_pwd_${finalCode}`, roomData.password);
      }

      setIsDialogOpen(false);
      router.push(`/${finalCode}`);
    } catch (error) {
      toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joinCodeRef.current) return;

    setIsJoiningRoom(true);
    setJoinError(null);

    const code = joinCodeRef.current.value.toUpperCase();
    
    let currentUser = user;
    if (!currentUser && auth) {
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      } catch (err) {
        setJoinError('Ошибка авторизации.');
        setIsJoiningRoom(false);
        return;
      }
    }

    if (!firestore || !currentUser) {
      setJoinError('База данных не готова.');
      setIsJoiningRoom(false);
      return;
    }

    try {
      const roomRef = doc(firestore, 'rooms', code);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setJoinError('Комната не найдена.');
      } else {
        const rData = roomSnap.data();
        if (rData.onlyAuthorized && currentUser.isAnonymous) {
          setJoinError('Только для авторизованных пользователей.');
        } else {
          router.push(`/${code}`);
        }
      }
    } catch (error) {
      setJoinError(getErrorMessage(error));
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Вы вышли из аккаунта' });
    } catch (error) {
      toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <RegistrationSuggestion />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/dev">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Для разработчиков</span>
          </Link>
        </Button>
        {isAnanas && (
          <Button variant="outline" size="icon" asChild title="Панель управления">
            <Link href="/admin">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {user && !user.isAnonymous ? (
          <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Привет, {user.displayName || 'Пользователь'}</span>
              {isAnanas && <PineappleBadge className="h-4 w-4" />}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <AuthModal />
        )}
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-2 select-none">
          <KidalovoLogo />
          <h1 className="text-5xl font-bold tracking-tight text-center">
            Kidalovo
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Интерактивная доска для сообщений в реальном времени.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-4 w-full">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full">
                <Plus className="mr-2 h-5 w-5" />
                Создать комнату
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Настройка комнаты</DialogTitle>
                <DialogDescription>Создайте уникальную доску для обсуждений.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code" className="flex items-center gap-2">Код комнаты</Label>
                  <Input
                    id="code"
                    placeholder={user?.isAnonymous ? "Случайный код (авторизуйтесь для кастомного)" : "Оставьте пустым для случайного"}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={10}
                    disabled={user?.isAnonymous}
                    className="uppercase tracking-widest"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {isPrivate ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                      Приватная комната
                    </Label>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {onlyAuthorized ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                      Только для авторизованных
                    </Label>
                  </div>
                  <Switch
                    checked={onlyAuthorized}
                    onCheckedChange={(val) => {
                      if (user?.isAnonymous) {
                         toast({ title: 'Доступ ограничен', description: 'Сначала войдите в аккаунт' });
                         return;
                      }
                      setOnlyAuthorized(val);
                    }}
                    disabled={user?.isAnonymous}
                  />
                </div>
                {isPrivate && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showRoomPassword ? "text" : "password"}
                        placeholder="Введите пароль"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        required={isPrivate}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowRoomPassword(!showRoomPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showRoomPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreateRoom} disabled={isCreatingRoom} className="w-full">
                   {isCreatingRoom ? <Loader2 className="animate-spin" /> : 'Создать'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative w-full text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Или войти</span>
            </div>
          </div>
          
          <form onSubmit={handleJoinRoom} className="flex items-start gap-2">
            <div className="space-y-1 flex-grow">
              <Input
                ref={joinCodeRef}
                name="code"
                placeholder="A1B2"
                className="w-full text-center text-lg font-semibold tracking-widest uppercase"
                maxLength={10}
                required
                disabled={isJoiningRoom}
              />
              {joinError && <p className="text-[0.8rem] font-medium text-destructive text-center">{joinError}</p>}
            </div>
            <Button type="submit" size="lg" variant="secondary" disabled={isJoiningRoom}>
              {isJoiningRoom ? <Loader2 className="animate-spin" /> : 'Войти'}
            </Button>
          </form>
          
          <Separator />
          <div className="justify-center flex">
            <UserGuide />
          </div>
        </div>
      </div>
      <footer className="absolute bottom-4 text-xs text-muted-foreground">Powered by Глеб Дюмин</footer>
    </main>
  );
}

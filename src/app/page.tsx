'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Unlock, Plus, LogOut, Info, Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { generateRoomCode, getErrorMessage } from '@/lib/utils';
import { z } from 'zod';
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

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinCodeRef = useRef<HTMLInputElement>(null);

  // Create room form state
  const [customCode, setCustomCode] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [onlyAuthorized, setOnlyAuthorized] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Проверка на глобального админа Ananas по уникальному email
  const isAnanas = user?.email === 'ananas@kidalovo.internal';

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const handleCreateRoom = async () => {
    if (!firestore || !user) return;
    setIsCreatingRoom(true);

    const finalCode = customCode.trim().toUpperCase() || generateRoomCode();
    
    // Validation
    if (customCode.trim()) {
      if (user.isAnonymous) {
        toast({
          title: 'Доступ запрещен',
          description: 'Кастомные коды доступны только зарегистрированным пользователям.',
          variant: 'destructive',
        });
        setIsCreatingRoom(false);
        return;
      }
      
      const minLen = isAnanas ? 1 : 5;
      if (customCode.length < minLen || customCode.length > 10) {
        toast({
          title: 'Ошибка',
          description: `Кастомный код должен быть от ${minLen} до 10 символов.`,
          variant: 'destructive',
        });
        setIsCreatingRoom(false);
        return;
      }
    }

    const roomRef = doc(firestore, 'rooms', finalCode);

    try {
      const docSnap = await getDoc(roomRef);

      if (docSnap.exists()) {
        toast({
          title: 'Ошибка',
          description: `Код комнаты ${finalCode} уже занят.`,
          variant: 'destructive',
        });
        setIsCreatingRoom(false);
        return;
      }

      const roomData: any = {
        code: finalCode,
        createdAt: serverTimestamp(),
        creatorId: user.uid,
        onlyAuthorized: onlyAuthorized,
        members: {
          [user.uid]: {
            role: 'owner',
            name: user.displayName || 'Создатель'
          },
        },
      };

      if (isPrivate && roomPassword.trim()) {
        roomData.password = roomPassword.trim();
      }

      await setDoc(roomRef, roomData);
      
      // Создаем аудит-лог если комната закрытая
      if (onlyAuthorized) {
        await addDoc(collection(firestore, 'rooms', finalCode, 'messages'), {
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
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  const joinRoomSchema = z.object({
    code: z
      .string()
      .min(1, 'Код слишком короткий')
      .max(10, 'Код слишком длинный')
      .regex(/^[A-Z0-9]+$/, 'Только латинские буквы и цифры'),
  });

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !joinCodeRef.current) return;
    
    setIsJoiningRoom(true);
    setJoinError(null);

    const formData = new FormData(e.currentTarget);
    const code = (formData.get('code') as string)?.toUpperCase();

    const validatedFields = joinRoomSchema.safeParse({ code });

    if (!validatedFields.success) {
      setJoinError(validatedFields.error.errors.map((e) => e.message).join(', '));
      setIsJoiningRoom(false);
      return;
    }

    try {
      const roomRef = doc(firestore, 'rooms', validatedFields.data.code);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setJoinError('Комната не найдена.');
      } else {
        const rData = roomSnap.data();
        if (rData.onlyAuthorized && user?.isAnonymous) {
          setJoinError('Эта комната доступна только авторизованным пользователям.');
        } else {
          router.push(`/${validatedFields.data.code}`);
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

  if (isUserLoading || !auth) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rusToEngMap: { [key: string]: string } = {
        'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
        'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l',
        'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
    };
    
    let value = e.target.value;
    let translatedValue = '';
    for (let i = 0; i < value.length; i++) {
        const char = value[i].toLowerCase();
        translatedValue += rusToEngMap[char] || value[i];
    }
    
    e.target.value = translatedValue
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
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

      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 select-none">
          <KidalovoLogo />
          <h1 className="text-5xl font-bold tracking-tight text-center">
            Kidalovo
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Интерактивная доска для сообщений в реальном времени.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 rounded-lg border bg-card p-6 shadow-sm w-full max-w-md">
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" disabled={!user}>
                <Plus className="mr-2 h-5 w-5" />
                Создать комнату
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Настройка комнаты</DialogTitle>
                <DialogDescription>
                  Создайте уникальную доску для обсуждений.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    Код комнаты
                    {user?.isAnonymous && <Info className="h-3 w-3 text-destructive" title="Только для авторизованных" />}
                  </Label>
                  <Input
                    id="code"
                    placeholder={user?.isAnonymous ? "Случайный код (авторизуйтесь)" : (isAnanas ? "Любая длина (админ)" : "Оставьте пустым для случайного")}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={10}
                    disabled={user?.isAnonymous}
                    className="uppercase tracking-widest"
                  />
                  {user?.isAnonymous && <p className="text-[10px] text-destructive">Кастомные коды доступны только после входа в аккаунт.</p>}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {isPrivate ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                      Приватная комната
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Доступ только по паролю</p>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {onlyAuthorized ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                      Только для авторизованных
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Анонимы не смогут войти</p>
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
                      <button
                        type="button"
                        onClick={() => setShowRoomPassword(!showRoomPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
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
              <span className="bg-card px-2 text-muted-foreground">Или войти</span>
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
                onChange={handleCodeInputChange}
                required
                disabled={isJoiningRoom}
              />
              {joinError && (
                <p className="text-[0.8rem] font-medium text-destructive text-center">
                  {joinError}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" variant="secondary" disabled={isJoiningRoom || !user}>
              {isJoiningRoom ? <Loader2 className="animate-spin" /> : 'Войти'}
            </Button>
          </form>
          
          <Separator />
          <div className="flex justify-center">
            <UserGuide />
          </div>
        </div>
      </div>
      <footer className="absolute bottom-4 text-xs text-muted-foreground">
        Powered by Глеб Дюмин
      </footer>
    </main>
  );
}

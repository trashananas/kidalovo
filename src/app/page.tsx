
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Unlock, Plus } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateRoomCode, getErrorMessage } from '@/lib/utils';
import { z } from 'zod';
import { UserGuide } from '@/components/user-guide';
import { KidalovoLogo } from '@/components/kidalovo-logo';
import { Separator } from '@/components/ui/separator';
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
  const [roomPassword, setRoomPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const handleCreateRoom = async () => {
    if (!firestore || !user) return;
    setIsCreatingRoom(true);

    const finalCode = customCode.trim().toUpperCase() || generateRoomCode();
    
    // Validation for custom code if provided
    if (customCode.trim()) {
      if (customCode.length < 4 || customCode.length > 10) {
        toast({
          title: 'Ошибка',
          description: 'Кастомный код должен быть от 4 до 10 символов.',
          variant: 'destructive',
        });
        setIsCreatingRoom(false);
        return;
      }
      if (!/^[A-Z0-9]+$/.test(finalCode)) {
        toast({
          title: 'Ошибка',
          description: 'Код может содержать только латинские буквы и цифры.',
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
          description: `Код комнаты ${finalCode} уже занят. Выберите другой.`,
          variant: 'destructive',
        });
        setIsCreatingRoom(false);
        return;
      }

      const roomData: any = {
        code: finalCode,
        createdAt: serverTimestamp(),
        creatorId: user.uid,
        members: {
          [user.uid]: 'owner',
        },
      };

      if (isPrivate && roomPassword.trim()) {
        roomData.password = roomPassword.trim();
      }

      await setDoc(roomRef, roomData);
      
      // If private, store password in sessionStorage for the creator as well
      if (roomData.password) {
        sessionStorage.setItem(`room_pwd_${finalCode}`, roomData.password);
      }

      setIsDialogOpen(false);
      router.push(`/${finalCode}`);
    } catch (error) {
      console.error(`Ошибка при создании комнаты:`, error);
      toast({
        title: 'Ошибка',
        description: `Не удалось создать комнату: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  const joinRoomSchema = z.object({
    code: z
      .string()
      .min(4, 'Код должен быть не менее 4 символов')
      .max(10, 'Код должен быть не более 10 символов')
      .regex(/^[A-Z0-9]+$/, 'Код должен состоять из заглавных латинских букв и цифр'),
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
        setJoinError('Комната не найдена. Пожалуйста, проверьте код.');
      } else {
        router.push(`/${validatedFields.data.code}`);
      }
    } catch (error) {
      setJoinError(getErrorMessage(error));
       toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }

    setIsJoiningRoom(false);
  };

  if (isUserLoading || !auth) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
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
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 select-none">
          <KidalovoLogo />
          <h1 className="text-5xl font-bold tracking-tight text-center font-headline">
            Kidalovo
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Совместная доска для сообщений в реальном времени. Создайте комнату
            и поделитесь кодом или присоединитесь к существующей.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 rounded-lg border bg-card p-6 shadow-sm w-full max-w-md">
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" disabled={!user}>
                <Plus className="mr-2 h-5 w-5" />
                Создать новую комнату
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Настройка комнаты</DialogTitle>
                <DialogDescription>
                  Вы можете задать свой код или оставить поле пустым для случайного.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Код комнаты (A-Z, 0-9)</Label>
                  <Input
                    id="code"
                    placeholder="Оставьте пустым для случайного"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={10}
                    className="uppercase tracking-widest"
                  />
                  <p className="text-[10px] text-muted-foreground">От 4 до 10 символов</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {isPrivate ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                      Приватная комната
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Потребуется пароль для входа</p>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>
                {isPrivate && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Введите пароль"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      required={isPrivate}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreateRoom} disabled={isCreatingRoom} className="w-full">
                   {isCreatingRoom ? (
                    <><Loader2 className="animate-spin mr-2" /> Создание...</>
                  ) : (
                    'Создать'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative w-full text-center select-none">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground select-none">Или</span>
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
              {isJoiningRoom ? (
                <>
                  <Loader2 className="animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
          
          <Separator className="my-2" />

          <div className="flex flex-col items-center text-center">
             <p className="text-sm text-muted-foreground mb-4">Инструменты и помощь</p>
             <div className="flex gap-2">
                <UserGuide />
             </div>
          </div>

        </div>
      </div>
      <footer className="absolute bottom-4 text-xs text-muted-foreground">
        Powered by Глеб Дюмин
      </footer>
    </main>
  );
}

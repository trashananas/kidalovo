'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PenSquare } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateRoomCode, getErrorMessage } from '@/lib/utils';
import { z } from 'zod';
import { UserGuide } from '@/components/user-guide';

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

  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const handleCreateRoom = async () => {
    if (!firestore || !user) return;
    setIsCreatingRoom(true);

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      const roomCode = generateRoomCode();
      const roomRef = doc(firestore, 'rooms', roomCode);

      try {
        const docSnap = await getDoc(roomRef);

        if (docSnap.exists()) {
          console.log(`Код комнаты ${roomCode} уже существует. Повторная попытка...`);
          continue;
        }

        await setDoc(roomRef, {
          code: roomCode,
          createdAt: serverTimestamp(),
          creatorId: user.uid,
          members: {
            [user.uid]: 'owner',
          },
        });
        
        router.push(`/${roomCode}`);
        return; // Exit on success

      } catch (error) {
        console.error(`Ошибка при создании комнаты:`, error);
        if (attempts === maxAttempts) {
          toast({
            title: 'Ошибка',
            description: `Не удалось создать комнату: ${getErrorMessage(error)}`,
            variant: 'destructive',
          });
        }
      }
    }

    if (attempts === maxAttempts) {
         toast({
            title: 'Ошибка',
            description: 'Не удалось создать уникальную комнату после 10 попыток.',
            variant: 'destructive',
          });
    }

    setIsCreatingRoom(false);
  };
  
  const joinRoomSchema = z.object({
    code: z
      .string()
      .length(4, 'Код должен состоять из 4 символов')
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

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <PenSquare className="h-16 w-16 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight text-center font-headline">
            Kidalovo
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Совместная доска для сообщений в реальном времени. Создайте комнату
            и поделитесь кодом или присоединитесь к существующей.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex gap-2">
            <Button size="lg" onClick={handleCreateRoom} disabled={isCreatingRoom || !user}>
              {isCreatingRoom ? (
                <>
                  <Loader2 className="animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать новую комнату'
              )}
            </Button>
            <UserGuide />
          </div>

          <div className="relative w-full text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Или</span>
            </div>
          </div>
          
          <form onSubmit={handleJoinRoom} className="flex items-start gap-2">
            <div className="space-y-1">
              <Input
                ref={joinCodeRef}
                name="code"
                placeholder="A1B2"
                className="w-40 text-center text-lg font-semibold tracking-widest uppercase"
                maxLength={4}
                onChange={(e) => {
                  e.target.value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');
                }}
                required
                disabled={isJoiningRoom}
              />
              {joinError && (
                <p className="text-[0.8rem] font-medium text-destructive">
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
                'Войти в комнату'
              )}
            </Button>
          </form>

        </div>
      </div>
    </main>
  );
}

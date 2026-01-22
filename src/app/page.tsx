'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createRoom, joinRoom } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PenSquare } from 'lucide-react';

function CreateRoomButton() {
  const { pending } = useFormStatus();

  return (
    <Button size="lg" type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Создание...
        </>
      ) : (
        'Создать новую комнату'
      )}
    </Button>
  );
}

function CreateRoomForm() {
  const [state, formAction] = useActionState(createRoom, { message: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (state?.message) {
      toast({
        title: 'Ошибка',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction}>
      <CreateRoomButton />
    </form>
  );
}

function JoinRoomButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" variant="secondary" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Вход...
        </>
      ) : (
        'Войти в комнату'
      )}
    </Button>
  );
}

function JoinRoomForm() {
  const [state, formAction] = useActionState(joinRoom, { message: '' });
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.message) {
      // Показывать ошибки валидации встроенно, а не в тосте
      if (!state.message.toLowerCase().includes('код')) {
        toast({
          title: 'Ошибка',
          description: state.message,
          variant: 'destructive',
        });
      }
      // При ошибке сфокусироваться на поле ввода, чтобы пользователь мог ее исправить
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="space-y-1">
        <Input
          ref={inputRef}
          name="code"
          placeholder="ABCD"
          className="w-32 text-center text-lg font-semibold tracking-widest uppercase"
          maxLength={4}
          onChange={(e) => {
            e.target.value = e.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, '');
          }}
          required
        />
        {state.message && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {state.message}
          </p>
        )}
      </div>
      <JoinRoomButton />
    </form>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <PenSquare className="h-16 w-16 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight text-center font-headline">
            Доска для записок
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Совместная доска для сообщений в реальном времени. Создайте комнату
            и поделитесь кодом или присоединитесь к существующей.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 shadow-sm">
          <CreateRoomForm />
          <div className="relative w-full text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Или</span>
            </div>
          </div>
          <JoinRoomForm />
        </div>
      </div>
    </main>
  );
}

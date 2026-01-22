'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoom, joinRoom } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, PenSquare } from 'lucide-react';

const joinRoomSchema = z.object({
  code: z
    .string()
    .length(4, 'Код должен состоять из 4 букв')
    .regex(/^[A-Z]+$/, 'Код должен состоять из заглавных латинских букв'),
});

function CreateRoomForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Ошибка',
        description: error,
        variant: 'destructive',
      });
      setError(null);
    }
  }, [error, toast]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createRoom({ message: '' }, formData);
      if (result?.message) {
        setError(result.message);
      }
    });
  };

  return (
    <form action={handleSubmit}>
      <Button size="lg" type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Создание...
          </>
        ) : (
          'Создать новую комнату'
        )}
      </Button>
    </form>
  );
}

function JoinRoomForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof joinRoomSchema>>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Ошибка',
        description: error,
        variant: 'destructive',
      });
      form.reset();
      setError(null);
    }
  }, [error, toast, form]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await joinRoom({ message: '' }, formData);
      if (result?.message) {
        setError(result.message);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        ref={formRef}
        action={handleSubmit}
        onSubmit={form.handleSubmit(() => formRef.current?.submit())}
        className="flex items-start gap-2"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  placeholder="ABCD"
                  className="w-32 text-center text-lg font-semibold tracking-widest uppercase"
                  maxLength={4}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" variant="secondary" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Вход...
            </>
          ) : (
            'Войти в комнату'
          )}
        </Button>
      </form>
    </Form>
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
            Совместная доска для сообщений в реальном времени. Создайте комнату и поделитесь кодом или присоединитесь к существующей.
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

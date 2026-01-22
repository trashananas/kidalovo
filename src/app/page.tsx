'use client';

import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoom, joinRoom } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { PenSquare } from 'lucide-react';

const joinRoomSchema = z.object({
  code: z
    .string()
    .length(4, 'Code must be 4 letters')
    .regex(/^[A-Z]+$/, 'Code must be uppercase letters'),
});

function CreateRoomForm() {
  const [state, formAction] = useFormState(createRoom, { message: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (state?.message) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction}>
      <Button size="lg" type="submit">
        Create a new room
      </Button>
    </form>
  );
}

function JoinRoomForm() {
  const [state, formAction] = useFormState(joinRoom, { message: '' });
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof joinRoomSchema>>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    if (state?.message) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
      });
      form.reset();
    }
  }, [state, toast, form]);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        action={formAction}
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" variant="secondary">
          Join Room
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
            LetterBoard
          </h1>
          <p className="text-muted-foreground text-center max-w-sm">
            A real-time, collaborative message board. Create a room and share
            the code, or join an existing one.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 shadow-sm">
          <CreateRoomForm />
          <div className="relative w-full text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <JoinRoomForm />
        </div>
      </div>
    </main>
  );
}

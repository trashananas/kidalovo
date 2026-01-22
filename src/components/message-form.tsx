'use client';

import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sendMessage } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from './ui/card';
import { Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase';

const messageSchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым').max(280),
});

type MessageFormProps = {
  roomId: string;
};

export function MessageForm({ roomId }: MessageFormProps) {
  const [state, formAction] = useFormState(sendMessage, { message: '' });
  const formRef = useRef<HTMLFormElement>(null);
  const { user } = useUser();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
    },
  });

  useEffect(() => {
    if (state?.message === 'Сообщение отправлено!') {
      form.reset();
    }
  }, [state, form]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(() => formRef.current?.requestSubmit())();
    }
  };

  if (!user) {
    return null; // Or a loading indicator
  }

  return (
    <Card className="shadow-2xl">
      <CardContent className="p-4">
        <Form {...form}>
          <form
            ref={formRef}
            action={formAction}
            onSubmit={form.handleSubmit(() => formRef.current?.requestSubmit())}
            className="flex items-start gap-4"
          >
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="userId" value={user.uid} />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Введите ваше сообщение... (Shift+Enter для новой строки)"
                      className="min-h-0 resize-none"
                      rows={1}
                      onKeyDown={handleTextareaKeyDown}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={form.formState.isSubmitting}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Отправить</span>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

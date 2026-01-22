'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const messageSchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым'),
});

type MessageFormProps = {
  roomId: string;
  panOffset: { x: number; y: number };
};

export function MessageForm({ roomId, panOffset }: MessageFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;

    try {
      const messagesColRef = collection(firestore, 'rooms', roomId, 'messages');
      await addDoc(messagesColRef, {
        text: values.message,
        userId: user.uid,
        createdAt: serverTimestamp(),
        position: {
          x: Math.random() * (window.innerWidth * 0.6) + 20 - panOffset.x,
          y: Math.random() * (window.innerHeight * 0.4) + 20 - panOffset.y,
        },
        size: {
          width: 256,
          height: 128,
        },
      });
      form.reset();
    } catch (error) {
       toast({
        title: 'Ошибка отправки',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="shadow-2xl">
      <CardContent className="p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex items-start gap-4"
          >
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
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={form.formState.isSubmitting || !form.formState.isValid}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Отправить</span>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

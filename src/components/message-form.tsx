'use client';

import { useRef, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

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

  const handleFormat = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionStart === textarea.selectionEnd) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText =
      textarea.value.substring(0, start) +
      wrapper +
      selectedText +
      wrapper +
      textarea.value.substring(end);

    form.setValue('message', newText, { shouldValidate: true });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
    }, 0);
  };

  const handleAddLink = () => {
    const textarea = textareaRef.current;
    if (!textarea || !linkUrl.trim()) return;

    const { start, end } = selectionRef.current || {
      start: textarea.selectionEnd,
      end: textarea.selectionEnd,
    };

    const selectedText = textarea.value.substring(start, end) || linkUrl;
    const newText =
      textarea.value.substring(0, start) +
      `@${selectedText}@{${linkUrl}}` +
      textarea.value.substring(end);

    form.setValue('message', newText, { shouldValidate: true });
    setIsLinkDialogOpen(false);
    setLinkUrl('');

    setTimeout(() => {
      textarea.focus();
      const newCursorPosition =
        start + `@${selectedText}@{${linkUrl}}`.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
      return;
    }

    if (e.ctrlKey) {
      let handled = true;
      if (e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case 'X':
            handleFormat('$');
            break;
          case 'P':
            handleFormat('#');
            break;
          default:
            handled = false;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'b':
            handleFormat('*');
            break;
          case 'i':
            handleFormat('\\');
            break;
          case 'u':
            handleFormat('_');
            break;
          case 'k':
            {
              const textarea = textareaRef.current;
              if (textarea) {
                selectionRef.current = {
                  start: textarea.selectionStart,
                  end: textarea.selectionEnd,
                };
              }
              setIsLinkDialogOpen(true);
            }
            break;
          default:
            handled = false;
        }
      }

      if (handled) {
        e.preventDefault();
      }
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
                      ref={(e) => {
                        field.ref(e);
                        textareaRef.current = e;
                      }}
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
            <Button
              type="submit"
              size="icon"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Отправить</span>
            </Button>
          </form>
        </Form>
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить ссылку</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link-url" className="text-right">
                  URL
                </Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="col-span-3"
                  placeholder="https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleAddLink}>
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

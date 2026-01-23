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
import { Send, Paperclip, X, File as FileIcon, Loader2 } from 'lucide-react';
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

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB for Cloudinary
const FIRESTORE_UPLOAD_LIMIT = 750 * 1024; // 750 KB for Firestore

const messageSchema = z
  .object({
    message: z.string(),
    file: z.instanceof(File).nullable(),
  })
  .refine((data) => data.message.trim().length > 0 || !!data.file, {
    message: 'Сообщение не может быть пустым',
    path: ['message'],
  })
  .refine((data) => !data.file || data.file.size <= MAX_FILE_SIZE_BYTES, {
    message: `Файл слишком большой. Максимальный размер: 100 МБ.`,
    path: ['file'],
  });

type MessageFormProps = {
  roomId: string;
  panOffset: { x: number; y: number };
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function MessageForm({ roomId, panOffset }: MessageFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
      file: null,
    },
  });

  const selectedFile = form.watch('file');
  const isImagePreview = selectedFile?.type.startsWith('image/');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: 'Файл слишком большой',
        description: `Максимальный размер файла — 100 МБ.`,
        variant: 'destructive',
      });
      return;
    }

    form.setValue('file', file, { shouldValidate: true });

    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);
  };

  const removeFile = () => {
    form.setValue('file', null, { shouldValidate: true });
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;

    const { message, file } = values;

    if (!message.trim() && !file) return;

    setIsSubmitting(true);

    try {
      let fileAttachment: { name: string; type: string; url: string } | null =
        null;

      if (file) {
        if (file.size < FIRESTORE_UPLOAD_LIMIT) {
          // File is small, embed it as a Data URL in Firestore
          const dataUrl = await fileToDataUrl(file);
          fileAttachment = {
            name: file.name,
            type: file.type,
            url: dataUrl,
          };
          toast({
            title: 'Загрузка...',
            description: 'Небольшой файл загружается напрямую.',
          });
        } else {
          // File is large, use signed upload to Cloudinary
          toast({
            title: 'Загрузка...',
            description: 'Большой файл загружается через облачное хранилище.',
          });
          
          // 1. Get signature from our server
          const timestamp = Math.round(new Date().getTime() / 1000);
          const paramsToSign = {
            timestamp: timestamp,
            folder: 'note-board-uploads',
            use_filename: true,
            unique_filename: true,
          };

          const signResponse = await fetch('/api/sign-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign }),
          });

          if (!signResponse.ok) {
            throw new Error('Не удалось получить подпись для загрузки от сервера.');
          }

          const { signature } = await signResponse.json();
          if (!signature) {
             throw new Error('Подпись не была получена от сервера.');
          }

          // 2. Upload directly to Cloudinary
          const formData = new FormData();
          formData.append('file', file);
          formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
          formData.append('timestamp', timestamp.toString());
          formData.append('signature', signature);
          formData.append('folder', 'note-board-uploads');
          formData.append('use_filename', 'true');
          formData.append('unique_filename', 'true');

          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`;

          const cloudinaryResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
          });

          if (!cloudinaryResponse.ok) {
            const errorData = await cloudinaryResponse.json();
            throw new Error(errorData.error.message || 'Не удалось загрузить файл в Cloudinary.');
          }

          const result = await cloudinaryResponse.json();
          fileAttachment = {
            name: file.name,
            type: file.type,
            url: result.secure_url,
          };
        }
      }

      const isImage = file?.type.startsWith('image/');
      const messagesColRef = collection(firestore, 'rooms', roomId, 'messages');
      await addDoc(messagesColRef, {
        text: message,
        file: fileAttachment,
        userId: user.uid,
        createdAt: serverTimestamp(),
        position: {
          x: Math.random() * (window.innerWidth * 0.6) + 20 - panOffset.x,
          y: Math.random() * (window.innerHeight * 0.4) + 20 - panOffset.y,
        },
        size: {
          width: 320,
          height: isImage ? 240 : file ? 160 : 128,
        },
      });
      form.reset();
      removeFile();
    } catch (error) {
      toast({
        title: 'Ошибка отправки сообщения',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
            className="flex flex-col gap-2"
          >
            {selectedFile && filePreviewUrl && (
              <div className="relative p-2 border rounded-md bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 z-10 h-6 w-6 flex-shrink-0 bg-background/50 hover:bg-background/80 rounded-full"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
                {isImagePreview ? (
                  <img
                    src={filePreviewUrl}
                    alt="Предпросмотр"
                    className="max-h-28 w-auto rounded-md mx-auto"
                  />
                ) : (
                  <div className="flex items-center gap-3 pr-6">
                    <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.type || 'unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-start gap-4">
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
                        placeholder="Введите ваше сообщение..."
                        className="min-h-0 resize-none"
                        rows={1}
                        onKeyDown={handleTextareaKeyDown}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                hidden
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Прикрепить файл</span>
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">Отправить</span>
              </Button>
            </div>
            {form.formState.errors.file && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.file.message}
              </p>
            )}
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

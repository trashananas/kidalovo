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
import { useUser, useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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

const messageSchema = z
  .object({
    message: z.string(),
    file: z.instanceof(File).nullable(),
  })
  .refine((data) => data.message.trim().length > 0 || !!data.file, {
    message: 'Сообщение не может быть пустым',
    path: ['message'],
  });

type MessageFormProps = {
  roomId: string;
  panOffset: { x: number; y: number };
};

export function MessageForm({ roomId, panOffset }: MessageFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;

    const { message, file } = values;
    if (!message && !file) return;

    let fileAttachment: { name: string; type: string; url: string } | null = null;
    let uploadError: Error | null = null;

    if (file) {
      // Primary method: Firebase Storage
      try {
        if (!storage) {
          throw new Error("Firebase Storage не инициализирован.");
        }
        const filePath = `files/${roomId}/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        await uploadBytes(fileStorageRef, file);
        const downloadUrl = await getDownloadURL(fileStorageRef);

        fileAttachment = {
          name: file.name,
          type: file.type,
          url: downloadUrl,
        };
      } catch (storageError) {
        console.warn("Ошибка загрузки в Storage. Попытка резервной загрузки:", storageError);
        
        // Fallback method: Base64 in Firestore
        const MAX_SIZE_BYTES = 750 * 1024; // 750 KB
        if (file.size > MAX_SIZE_BYTES) {
          uploadError = new Error("Хранилище файлов временно недоступно, а размер файла превышает 750КБ для резервного метода.");
        } else {
          try {
            const dataUrl = await toBase64(file);
            fileAttachment = {
              name: file.name,
              type: file.type,
              url: dataUrl,
            };
          } catch (base64Error) {
            uploadError = new Error(`Ошибка при подготовке файла для резервной загрузки: ${getErrorMessage(base64Error)}`);
          }
        }
      }
    }

    if (uploadError) {
      toast({
        title: 'Ошибка загрузки файла',
        description: getErrorMessage(uploadError),
        variant: 'destructive',
      });
      return; 
    }

    try {
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
            height: isImage ? 240 : (file ? 160 : 128),
        },
      });
      form.reset();
      removeFile();
    } catch (firestoreError) {
      toast({
        title: 'Ошибка отправки сообщения',
        description: getErrorMessage(firestoreError),
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
                        <img src={filePreviewUrl} alt="Предпросмотр" className="max-h-28 w-auto rounded-md mx-auto" />
                    ) : (
                    <div className="flex items-center gap-3 pr-6">
                        <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedFile.type || 'unknown'}</p>
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
                        disabled={form.formState.isSubmitting}
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
                disabled={form.formState.isSubmitting}
              >
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Прикрепить файл</span>
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={
                  form.formState.isSubmitting || !form.formState.isValid
                }
              >
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Отправить</span>
              </Button>
            </div>
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

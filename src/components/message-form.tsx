'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from './ui/card';
import { Send, Paperclip, X, File as FileIcon, Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { FileAttachment, UserProfile } from '@/types';

const CHUNK_SIZE = 750000;
let isGlobalUploading = false;

const messageSchema = z.object({
  message: z.string(),
  file: z.any().nullable(),
}).refine(data => {
  const hasText = typeof data.message === 'string' && data.message.trim().length > 0;
  return hasText || !!data.file;
}, { message: 'Пустое сообщение', path: ['message'] });

export function MessageForm({ roomId, panOffset }: { roomId: string; panOffset: { x: number; y: number } }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user && !user.isAnonymous && firestore) {
      getDoc(doc(firestore, 'users', user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      });
    }
  }, [user, firestore]);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: '', file: null },
  });

  const fileToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleBackgroundUpload = async (file: File, messageId: string, fileId: string) => {
    if (!firestore) return;
    isGlobalUploading = true;
    
    const { id: toastId, update: updateToast } = toast({
      title: "Загрузка файла...",
      description: `Файл ${file.name} готовится к отправке.`,
    });

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);
        const base64 = await fileToBase64(chunk);
        
        const chunkRef = doc(firestore, 'rooms', roomId, 'file_chunks', fileId, 'chunks', `chunk_${i}`);
        const batch = writeBatch(firestore);
        batch.set(chunkRef, { data: base64, index: i });
        await batch.commit();
        
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        updateToast({
          id: toastId,
          title: `Загрузка: ${progress}%`,
          description: `Отправка ${file.name}...`,
        });
      }

      const messageRef = doc(firestore, 'rooms', roomId, 'messages', messageId);
      await updateDoc(messageRef, {
        'file.isUploading': false
      });

      updateToast({
        id: toastId,
        title: "Готово!",
        description: `Файл ${file.name} успешно загружен.`,
      });
    } catch (error: any) {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    } finally {
      isGlobalUploading = false;
    }
  };

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;

    const lowerMsg = values.message.toLowerCase();
    if (lowerMsg.includes('валикова')) {
      form.setError('message', { message: 'your message contains a nature error' });
      return;
    }

    try {
      let fileData: FileAttachment | null = null;
      let fileToUpload: File | null = null;
      let generatedFileId = "";

      if (values.file instanceof File) {
        if (file.size <= CHUNK_SIZE) {
          const base64 = await fileToBase64(values.file);
          fileData = { name: values.file.name, type: values.file.type, url: base64, size: values.file.size };
        } else {
          generatedFileId = crypto.randomUUID();
          fileToUpload = values.file;
          fileData = {
            name: values.file.name,
            type: values.file.type,
            fileId: generatedFileId,
            totalChunks: Math.ceil(values.file.size / CHUNK_SIZE),
            size: values.file.size,
            isUploading: true
          };
        }
      }

      const messageData = {
        roomId,
        text: values.message || '',
        userId: user.uid,
        authorName: profile?.username || (user.isAnonymous ? 'Аноним' : (user.displayName || 'Пользователь')),
        authorColor: profile?.color || '#666666',
        authorLogin: profile?.login || null,
        createdAt: serverTimestamp(),
        isDeleted: false,
        position: {
          x: (Math.random() - 0.5) * 400 - panOffset.x,
          y: (Math.random() - 0.5) * 400 - panOffset.y,
        },
        size: { width: 320, height: 140 },
        ...(fileData && { file: fileData })
      };

      const docRef = await addDoc(collection(firestore, 'rooms', roomId, 'messages'), messageData);

      if (fileToUpload && generatedFileId) {
        handleBackgroundUpload(fileToUpload, docRef.id, generatedFileId);
      }

      form.reset();
      form.setValue('file', null);
    } catch (error: any) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить.', variant: 'destructive' });
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGlobalUploading) {
      toast({ title: "Подождите", description: "Дождитесь окончания загрузки прошлого файла." });
      return;
    }
    const selected = e.target.files?.[0];
    if (selected) form.setValue('file', selected);
  };

  const selectedFile = form.watch('file');

  return (
    <Card className="shadow-xl">
      <CardContent className="p-3">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md border border-primary/20">
            <FileIcon className="h-4 w-4 text-primary" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs truncate font-medium">
                {selectedFile instanceof File ? selectedFile.name : 'Файл выбран'}
              </span>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => form.setValue('file', null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <div className="relative">
                      <Textarea 
                        {...field} 
                        placeholder="Сообщение..." 
                        className="min-h-[40px] max-h-[200px] resize-none py-2" 
                        rows={1}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            form.handleSubmit(onSubmit)(); 
                          } 
                        }}
                      />
                      <FormMessage className="absolute -top-6 left-0" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="button" size="icon" variant="outline" onClick={() => document.getElementById('file-input')?.click()} title="Прикрепить">
              <Paperclip className="h-4 w-4" />
            </Button>
            <input 
              id="file-input" 
              type="file" 
              className="hidden" 
              onChange={onFileSelect} 
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

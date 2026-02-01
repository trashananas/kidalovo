'use client';

import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from './ui/card';
import { Send, Paperclip, X, File as FileIcon, Loader2, AlertCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { FileAttachment, UserProfile } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    defaultValues: {
      message: '',
      file: null,
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    // 1. Если файл маленький (< 800KB), сохраняем в Firestore как Base64
    // Это самый надежный способ, так как он не блокируется AdBlock и не зависит от Cloudinary
    if (file.size < 800 * 1024) {
      try {
        const base64 = await fileToBase64(file);
        return { name: file.name, type: file.type, url: base64 };
      } catch (e) {
        console.error('Base64 conversion failed', e);
      }
    }

    // 2. Если файл больше, пробуем Cloudinary
    try {
      const signResponse = await fetch('/api/sign-upload', { method: 'POST' });
      if (!signResponse.ok) throw new Error('Не удалось получить подпись');
      
      const { timestamp, signature, apiKey, cloudName, folder } = await signResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          return { name: file.name, type: file.type, url: result.secure_url };
        }
      } catch (e: any) {
        console.warn('Direct upload blocked (likely AdBlock). Trying server fallback...');
      }

      // 3. Fallback: Загрузка через сервер (лимит Vercel 4.5MB)
      if (file.size > 4.4 * 1024 * 1024) {
        throw new Error('Файл слишком велик (>4.5MB) и заблокирован вашим AdBlock. Отключите его для прямой загрузки.');
      }

      const serverFormData = new FormData();
      serverFormData.append('file', file);
      const serverResponse = await fetch('/api/upload', { method: 'POST', body: serverFormData });
      
      if (!serverResponse.ok) {
        const errData = await serverResponse.json();
        throw new Error(errData.error || 'Ошибка серверной загрузки');
      }

      return await serverResponse.json();

    } catch (error: any) {
      toast({ 
        title: 'Ошибка загрузки', 
        description: error.message || 'Не удалось загрузить файл', 
        variant: 'destructive',
        duration: 8000,
      });
      return null;
    }
  };

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;
    setIsSubmitting(true);
    
    const messagesCol = collection(firestore, 'rooms', roomId, 'messages');
    let messageData: any = null;

    try {
      let fileAttachment: FileAttachment | null = null;
      if (values.file instanceof File) {
        fileAttachment = await uploadFile(values.file);
        // Если была ошибка загрузки и нет текста - отменяем
        if (!fileAttachment && !values.message.trim()) {
           setIsSubmitting(false);
           return;
        }
      }

      messageData = {
        roomId,
        text: values.message || '',
        userId: user.uid,
        authorName: profile?.username || (user.isAnonymous ? 'Аноним' : (user.displayName || 'Пользователь')),
        authorColor: profile?.color || '#666666',
        authorLogin: profile?.login || null,
        createdAt: serverTimestamp(),
        isDeleted: false,
        position: {
          x: Math.random() * 400 - panOffset.x,
          y: Math.random() * 200 - panOffset.y,
        },
        size: { width: 320, height: 140 }
      };

      if (fileAttachment) {
        messageData.file = fileAttachment;
      }

      await addDoc(messagesCol, messageData);
      form.reset();
      form.setValue('file', null);
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: messagesCol.path,
        operation: 'create',
        requestResourceData: messageData || values
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFile = form.watch('file');

  return (
    <Card className="shadow-xl">
      <CardContent className="p-3">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md border border-primary/20">
            <FileIcon className="h-4 w-4 text-primary" />
            <span className="text-xs truncate flex-1 font-medium">
              {selectedFile instanceof File ? selectedFile.name : 'Файл выбран'}
              <span className="ml-2 text-[10px] text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
            </span>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => form.setValue('file', null)}
            >
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
            <Button 
              type="button" 
              size="icon" 
              variant="outline" 
              className={selectedFile ? "border-primary text-primary" : ""}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input 
              id="file-input" 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                form.setValue('file', file);
              }} 
            />
            <Button type="submit" size="icon" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


'use client';

import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from './ui/card';
import { Send, Paperclip, X, File as FileIcon, Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { FileAttachment, UserProfile } from '@/types';

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
    // 1. Совсем маленькие файлы (< 800 КБ) - в Firestore (Base64)
    if (file.size < 800 * 1024) {
      try {
        const base64 = await fileToBase64(file);
        return { name: file.name, type: file.type, url: base64 };
      } catch (e) {
        console.error('Base64 conversion failed', e);
      }
    }

    // 2. Файлы до 4.5 МБ - через серверный прокси (избегаем CORS)
    if (file.size < 4.5 * 1024 * 1024) {
      try {
        const serverFormData = new FormData();
        serverFormData.append('file', file);
        const serverRes = await fetch('/api/upload', { method: 'POST', body: serverFormData });
        
        if (serverRes.ok) {
          return await serverRes.json();
        }
        console.warn('Server proxy upload failed, falling back to direct...');
      } catch (e) {
        console.warn('Server upload failed, falling back to direct...', e);
      }
    }

    // 3. Прямая загрузка в Cloudinary (для крупных файлов)
    try {
      const signResponse = await fetch('/api/sign-upload', { method: 'POST' });
      if (!signResponse.ok) {
        const errData = await signResponse.json();
        throw new Error(errData.error || 'Ошибка авторизации облака');
      }
      
      const { timestamp, signature, apiKey, cloudName, folder } = await signResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return { name: file.name, type: file.type, url: result.secure_url };
      } else {
        const errText = await response.text();
        throw new Error('Облако отклонило файл. Проверьте размер или AdBlock.');
      }
    } catch (e: any) {
      console.error('Upload failed:', e);
      throw new Error(e.message || 'у меня не получается загрузить файл а должно получаться!!! посмотри что не так и разберись');
    }
  };

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;
    setIsSubmitting(true);
    
    try {
      let fileAttachment: FileAttachment | null = null;
      if (values.file instanceof File) {
        fileAttachment = await uploadFile(values.file);
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
          x: Math.random() * 400 - panOffset.x,
          y: Math.random() * 200 - panOffset.y,
        },
        size: { width: 320, height: 140 },
        ...(fileAttachment && { file: fileAttachment })
      };

      await addDoc(collection(firestore, 'rooms', roomId, 'messages'), messageData);
      form.reset();
      form.setValue('file', null);
    } catch (error: any) {
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Failed to fetch', 
        variant: 'destructive'
      });
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

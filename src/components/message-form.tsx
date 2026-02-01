
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

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
      file: null,
    },
  });

  useEffect(() => {
    if (user && !user.isAnonymous && firestore) {
      getDoc(doc(firestore, 'users', user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      });
    } else {
      setProfile(null);
    }
  }, [user, firestore]);

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    try {
      const signResponse = await fetch('/api/sign-upload', { method: 'POST' });
      const signData = await signResponse.json();

      if (signData.error) throw new Error(signData.error);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      );
      const uploadData = await uploadResponse.json();

      if (uploadData.error) throw new Error(uploadData.error.message);

      return {
        name: file.name,
        type: file.type,
        url: uploadData.secure_url,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      toast({ 
        title: 'Ошибка загрузки файла', 
        description: 'не удается загрузить файл на сервер,что-то не так', 
        variant: 'destructive' 
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
        if (!fileAttachment && !values.message.trim()) {
           setIsSubmitting(false);
           return;
        }
      }

      messageData = {
        roomId,
        text: values.message,
        file: fileAttachment,
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

      await addDoc(messagesCol, messageData);
      form.reset();
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
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md">
            <FileIcon className="h-4 w-4" />
            <span className="text-xs truncate flex-1">
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

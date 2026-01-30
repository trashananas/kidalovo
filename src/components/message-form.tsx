
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
import { getErrorMessage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { FileAttachment, UserProfile } from '@/types';

const messageSchema = z.object({
  message: z.string(),
  file: z.instanceof(File).nullable(),
}).refine(data => data.message.trim().length > 0 || !!data.file, { message: 'Пустое сообщение', path: ['message'] });

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
    } else {
      setProfile(null);
    }
  }, [user, firestore]);

  const onSubmit = async (values: z.infer<typeof messageSchema>) => {
    if (!firestore || !user || !roomId) return;
    setIsSubmitting(true);
    try {
      let fileAttachment: FileAttachment | null = null;
      if (values.file) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((res) => {
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(values.file!);
        });
        fileAttachment = { name: values.file.name, type: values.file.type, url: dataUrl };
      }

      await addDoc(collection(firestore, 'rooms', roomId, 'messages'), {
        roomId,
        text: values.message,
        file: fileAttachment,
        userId: user.uid,
        authorName: profile?.username || 'Аноним',
        authorColor: profile?.color || '#666666',
        authorLogin: profile?.login || null,
        createdAt: serverTimestamp(),
        isDeleted: false,
        position: {
          x: Math.random() * 400 - panOffset.x,
          y: Math.random() * 200 - panOffset.y,
        },
        size: { width: 320, height: 140 }
      });
      form.reset();
    } catch (error) {
      toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardContent className="p-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Сообщение..." 
                      className="min-h-0 resize-none py-2" 
                      rows={1}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.handleSubmit(onSubmit)(); } }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="button" size="icon" variant="outline" onClick={() => document.getElementById('file-input')?.click()}><Paperclip className="h-4 w-4" /></Button>
            <input id="file-input" type="file" className="hidden" onChange={(e) => form.setValue('file', e.target.files?.[0] || null)} />
            <Button type="submit" size="icon" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

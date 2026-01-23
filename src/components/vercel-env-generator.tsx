'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Settings } from 'lucide-react';

export function VercelEnvGenerator() {
  const { toast } = useToast();
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const envContent = `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${cloudName}
CLOUDINARY_API_KEY=${apiKey}
CLOUDINARY_API_SECRET=${apiSecret}`;

  const handleCopyEnv = () => {
    if (!cloudName || !apiKey || !apiSecret) {
      toast({
        title: 'Пустые поля',
        description: 'Пожалуйста, заполните все поля.',
        variant: 'destructive',
      });
      return;
    }
    navigator.clipboard
      .writeText(envContent)
      .then(() => {
        toast({
          title: 'Скопировано!',
          description: 'Теперь вставьте это в Vercel.',
        });
      })
      .catch((err) => {
        toast({
          title: 'Ошибка',
          description: 'Не удалось скопировать в буфер обмена.',
          variant: 'destructive',
        });
      });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings />
          Настроить Vercel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Генератор переменных для Vercel</DialogTitle>
          <DialogDescription>
            Заполните поля, чтобы сгенерировать единую строку для вставки в Vercel.
            Это упрощает добавление переменных окружения.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cloud-name">Cloudinary Cloud Name</Label>
            <Input
              id="cloud-name"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value)}
              placeholder="Имя вашего облака из Cloudinary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">Cloudinary API Key</Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ваш API ключ из Cloudinary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-secret">Cloudinary API Secret</Label>
            <Input
              id="api-secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Ваш API секрет из Cloudinary"
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="env-content">Готовый текст для Vercel</Label>
            <Textarea
              id="env-content"
              readOnly
              value={envContent}
              rows={4}
              className="font-mono text-xs bg-muted"
              placeholder="Здесь появится сгенерированный текст..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Закрыть
            </Button>
          </DialogClose>
          <Button onClick={handleCopyEnv}>
            <Copy className="mr-2 h-4 w-4" />
            Скопировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

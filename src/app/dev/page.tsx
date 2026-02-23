
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Copy, Key, Terminal, Code, Globe, MessageSquare, Check, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DevPage() {
  const [apiKey, setApiKey] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState('https://kidalovo.vercel.app');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Сохраняем текущий origin для удобства тестирования, но предупреждаем пользователя
      setOrigin(window.location.origin);
    }
  }, []);

  const generateTimeBasedKey = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `kid_${timestamp}_${randomPart}`;
  };

  useEffect(() => {
    setApiKey(generateTimeBasedKey());
  }, []);

  const handleGenerateKey = () => {
    const newKey = generateTimeBasedKey();
    setApiKey(newKey);
    toast({
      title: 'Ключ сгенерирован',
      description: 'Теперь установите его в переменные окружения вашего сервера.',
    });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: 'Скопировано в буфер обмена' });
  };

  const jsExample = `// Пример на JavaScript (Node.js)
const fetch = require('node-fetch');

async function sendMessage() {
  // ВНИМАНИЕ: Замените '${origin}' на ваш реальный домен в продакшене
  const response = await fetch('${origin}/api/external/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${apiKey}'
    },
    body: JSON.stringify({
      action: 'send_message',
      chatId: 'my_room_id',
      userId: 'system',
      authorName: 'Бот-Помощник',
      text: 'Привет! Это автоматическое сообщение.'
    })
  });
  
  const data = await response.json();
  console.log(data);
}`;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Панель разработчика</h1>
            <p className="text-muted-foreground">Инструменты интеграции и документация API</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Важно для авторизации</AlertTitle>
            <AlertDescription className="text-xs">
              Ключ ниже нужно прописать в переменную <strong>EXTERNAL_API_SECRET</strong> на вашем хостинге (Vercel/Docker), иначе запросы будут отклонены.
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Про домены</AlertTitle>
            <AlertDescription className="text-xs">
              Сейчас в примерах указан <code>{origin}</code>. Для работы на внешних сайтах замените его на ваш основной домен (например, .vercel.app).
            </AlertDescription>
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Ваш API Ключ
            </CardTitle>
            <CardDescription>
              Используйте этот ключ в заголовке <code className="bg-muted px-1 rounded">x-api-key</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={apiKey} readOnly className="font-mono bg-zinc-100" />
              <Button variant="secondary" onClick={() => copyToClipboard(apiKey)}>
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button onClick={handleGenerateKey}>Сгенерировать новый</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="docs" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="docs">Документация</TabsTrigger>
            <TabsTrigger value="examples">Примеры кода</TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Эндпоинты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">POST</span>
                    <code className="text-sm font-bold">/api/external/chat</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Основной метод взаимодействия. Обязательно передавайте ключ в заголовках.</p>
                  
                  <div className="border rounded-lg p-4 space-y-4 bg-zinc-50/50">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-primary">Как исправить "Unauthorized":</h4>
                      <ol className="text-xs list-decimal pl-4 space-y-2 text-muted-foreground">
                        <li>Скопируйте сгенерированный выше ключ.</li>
                        <li>В файле <code>.env.local</code> (или в панели управления хостингом) добавьте строку:<br/>
                          <code className="bg-zinc-200 p-1 rounded text-black select-all">EXTERNAL_API_SECRET={apiKey}</code>
                        </li>
                        <li>Перезапустите сервер. Теперь запросы с этим ключом будут приниматься.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <CardTitle className="text-md flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Встраивание (Iframe)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Скопируйте этот код для вставки на ваш сайт. <strong>Внимание:</strong> если вы используете локальный адрес (localhost), чат будет виден только вам.
                  </p>
                  <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto relative group">
                    <pre>{`<iframe src="${origin}/chat/YOUR_ID" width="400" height="600"></iframe>`}</pre>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                      onClick={() => copyToClipboard(`<iframe src="${origin}/chat/YOUR_ID" width="400" height="600"></iframe>`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    * Замените YOUR_ID на уникальный идентификатор вашего чата (например, номер заказа).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Примеры интеграции
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Node.js / JavaScript</span>
                  <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{jsExample}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

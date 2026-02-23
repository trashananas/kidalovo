'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Copy, Key, Terminal, Code, Globe, MessageSquare, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function DevPage() {
  const [apiKey, setApiKey] = useState('kidalovo_secret_key_2024');
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateKey = () => {
    const newKey = 'kid_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
    toast({
      title: 'Ключ сгенерирован',
      description: 'Не забудьте обновить его в переменной EXTERNAL_API_SECRET на сервере.',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: 'Скопировано в буфер обмена' });
  };

  const jsExample = `// Пример на JavaScript (Node.js)
const fetch = require('node-fetch');

async function sendMessage() {
  const response = await fetch('https://kidalovo.vercel.app/api/external/chat', {
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

  const pythonExample = `# Пример на Python
import requests

url = "https://kidalovo.vercel.app/api/external/chat"
headers = {
    "x-api-key": "${apiKey}",
    "Content-Type": "application/json"
}

payload = {
    "action": "send_message",
    "chatId": "my_room_id",
    "userId": "system",
    "authorName": "System",
    "text": "Hello from Python!"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Ключ
            </CardTitle>
            <CardDescription>
              Используйте этот ключ в заголовке <code className="bg-muted px-1 rounded">x-api-key</code> для авторизации запросов.
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
            <p className="text-xs text-destructive">
              * Важно: Приложение использует ключ из переменной окружения <b>EXTERNAL_API_SECRET</b>. Убедитесь, что они совпадают.
            </p>
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
                  <p className="text-sm text-muted-foreground">Основной метод для взаимодействия с чатами.</p>
                  
                  <div className="border rounded-lg p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Создание чата (action: create_chat)</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li><b>chatId</b>: уникальный ID (например, номер заказа)</li>
                        <li><b>userId</b>: ID первого участника</li>
                        <li><b>authorName</b>: имя участника</li>
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Отправка сообщения (action: send_message)</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li><b>chatId</b>: ID чата</li>
                        <li><b>text</b>: содержание сообщения</li>
                        <li><b>authorName</b>: имя автора (например, "Поддержка")</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-md flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Встраивание (Iframe)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Вы можете встроить классический вид чата на свой сайт через iframe:
                  </p>
                  <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    {`<iframe 
  src="https://kidalovo.vercel.app/chat/YOUR_CHAT_ID" 
  width="400" 
  height="600" 
  frameborder="0"
></iframe>`}
                  </div>
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
                <div className="space-y-2">
                  <span className="text-sm font-medium">Python</span>
                  <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{pythonExample}</code>
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

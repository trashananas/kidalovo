'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Copy, Key, Terminal, Code, Globe, MessageSquare, Check, AlertTriangle, Info, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export default function DevPage() {
  const [apiKey, setApiKey] = useState('kid_prod_secret_2024_safe_key');
  const [isCopied, setIsCopied] = useState(false);
  const [prodDomain, setProdDomain] = useState('https://kidalovo.vercel.app');
  const { toast } = useToast();

  const handleGenerateKey = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    const newKey = `kid_${timestamp}_${randomPart}`;
    setApiKey(newKey);
    toast({
      title: 'Ключ сгенерирован',
      description: 'Теперь установите его в переменные окружения вашего сервера (EXTERNAL_API_SECRET).',
    });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: 'Скопировано в буфер обмена' });
  };

  const jsExample = `// Пример на JavaScript (Fetch)
async function sendMessage() {
  const response = await fetch('${prodDomain}/api/external/chat', {
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
          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>Готов к работе</AlertTitle>
            <AlertDescription className="text-xs">
              API теперь поддерживает CORS. Вы можете делать запросы прямо из браузера вашего сайта.
            </AlertDescription>
          </Alert>

          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-blue-600" />
                Целевой домен
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              <Input 
                value={prodDomain} 
                onChange={(e) => setProdDomain(e.target.value)}
                placeholder="https://your-site.vercel.app"
                className="h-8 text-xs bg-white"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Ваш API Ключ
            </CardTitle>
            <CardDescription>
              Ключ для заголовка <code className="bg-muted px-1 rounded">x-api-key</code>.
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
                  
                  <div className="border rounded-lg p-4 space-y-4 bg-zinc-50/50">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-primary">Важно:</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Если вы получаете "Server Configuration Error", убедитесь, что переменная <strong>EXTERNAL_API_SECRET</strong> прописана на вашем хостинге и совпадает с ключом выше.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <CardTitle className="text-md flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Встраивание (Iframe)
                  </CardTitle>
                  <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto relative group">
                    <pre>{`<iframe 
  src="${prodDomain}/chat/YOUR_CHAT_ID" 
  width="400" 
  height="600" 
  frameborder="0"
></iframe>`}</pre>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                      onClick={() => copyToClipboard(`<iframe src="${prodDomain}/chat/YOUR_CHAT_ID" width="400" height="600" frameborder="0"></iframe>`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
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
              <CardContent>
                <div className="space-y-2">
                  <span className="text-sm font-medium">JavaScript (Fetch API)</span>
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

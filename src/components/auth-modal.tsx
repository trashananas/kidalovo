
'use client';

import { useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User as UserIcon } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const USER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
];

// Внутренний суффикс для преобразования логина в формат email для Firebase
const INTERNAL_AUTH_DOMAIN = '@kidalovo.internal';

export function AuthModal() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const validateLogin = (val: string) => {
    return val.trim().length >= 5;
  };

  const formatAuthEmail = (val: string) => {
    return `${val.trim().toLowerCase()}${INTERNAL_AUTH_DOMAIN}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    if (!validateLogin(login)) {
      toast({ title: 'Ошибка', description: 'Логин должен быть не менее 5 символов', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const email = formatAuthEmail(login);
      await signInWithEmailAndPassword(auth, email, password);
      setIsOpen(false);
      toast({ title: 'Вы вошли в аккаунт' });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: 'Неверный логин или пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    if (!username.trim()) {
      toast({ title: 'Ошибка', description: 'Введите никнейм', variant: 'destructive' });
      return;
    }

    if (!validateLogin(login)) {
      toast({ title: 'Ошибка', description: 'Логин должен быть не менее 5 символов', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
        toast({ title: 'Ошибка', description: 'Пароль должен быть не менее 6 символов', variant: 'destructive' });
        return;
    }

    setIsLoading(true);

    try {
      const email = formatAuthEmail(login);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Assign a random color
      const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

      // Update auth profile
      await updateProfile(user, { displayName: username });

      // Create user document
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        username: username.trim(),
        color: randomColor,
        login: login.trim().toLowerCase()
      });

      setIsOpen(false);
      toast({ title: 'Аккаунт успешно создан!' });
    } catch (error) {
      toast({
        title: 'Ошибка регистрации',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserIcon className="h-4 w-4" />
          Аккаунт
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Авторизация</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="login">Логин</Label>
                <Input 
                  id="login" 
                  placeholder="Ваш уникальный логин" 
                  value={login} 
                  onChange={(e) => setLogin(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Запомнить меня
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Войти'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">Никнейм (для доски)</Label>
                <Input id="reg-username" placeholder="Как вас будут видеть" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-login">Логин (для входа)</Label>
                <Input 
                  id="reg-login" 
                  placeholder="Минимум 5 символов" 
                  value={login} 
                  onChange={(e) => setLogin(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Пароль</Label>
                <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Зарегистрироваться'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

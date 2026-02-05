'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AuthModal } from './auth-modal';

export function RegistrationSuggestion() {
  const { user, isUserLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Показываем окно при каждой загрузке, если пользователь анонимный
    if (!isUserLoading && user?.isAnonymous) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isUserLoading]);

  const handleClose = () => {
    setIsOpen(false);
    // Больше не сохраняем в sessionStorage, чтобы окно появилось снова при перезагрузке
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Привет! Ты еще не с нами?</DialogTitle>
          <DialogDescription>
            Регистрация дает возможность создавать комнаты с короткими кодами и закрепляет за тобой уникальный ник.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            Это бесплатно и займет всего пару секунд. Хочешь зарегистрироваться сейчас?
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={handleClose}>
            Позже
          </Button>
          <div onClick={handleClose}>
            <AuthModal />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

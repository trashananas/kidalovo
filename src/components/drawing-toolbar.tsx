'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Eraser, Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';

type DrawingToolbarProps = {
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  roomId: string;
};

export function DrawingToolbar({
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  roomId,
}: DrawingToolbarProps) {
  const colors = ['#000000', '#EF4444', '#3B82F6', '#22C55E', '#FACC15', '#FFFFFF'];
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearMyDrawings = async () => {
    if (!firestore || !user) {
        toast({ title: 'Вы не авторизованы', variant: 'destructive'});
        return;
    };
    setIsClearing(true);

    try {
      const pathsRef = collection(firestore, 'rooms', roomId, 'paths');
      const q = query(pathsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ title: 'Нечего стирать', description: 'Вы еще ничего не нарисовали.' });
        setIsClearing(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      toast({ title: 'Ваши рисунки стёрты' });

    } catch (error) {
      toast({ title: 'Ошибка', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-card p-2 rounded-lg border shadow-lg flex flex-col gap-4 w-40">
      <div>
        <span className="text-xs font-medium text-muted-foreground">Цвет</span>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {colors.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={cn(
                'w-8 h-8 rounded-md border-2 transition-all',
                color === c ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'border-card',
                c === '#FFFFFF' && 'border-muted'
              )}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-muted-foreground">Толщина: {strokeWidth}px</span>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={(value) => setStrokeWidth(value[0])}
          className="mt-2"
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleClearMyDrawings} disabled={isClearing}>
        {isClearing ? <Loader2 className="animate-spin" /> : <Eraser />}
        Стереть мои
      </Button>
    </div>
  );
}

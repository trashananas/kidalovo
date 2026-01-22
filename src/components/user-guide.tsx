'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { BookOpen } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export function UserGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <BookOpen />
          Руководство
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Руководство по "Доске для записок"</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <div className="space-y-6 text-sm text-foreground">
            <div>
              <h2 className="font-semibold text-lg mb-2">Добро пожаловать!</h2>
              <p>
                "Доска для записок" — это простое приложение для совместной работы с текстовыми заметками и изображениями в реальном времени. Создавайте комнаты, приглашайте друзей и обменивайтесь идеями в виде стикеров на виртуальной доске.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Начало работы</h3>
              <p className="mb-2">
                На главной странице у вас есть два варианта:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Создать новую комнату:</strong> Нажмите на эту кнопку, и для вас будет сгенерирована уникальная комната с 4-значным кодом из букв и цифр. Вы автоматически попадёте в неё.
                </li>
                <li>
                  <strong>Войти в комнату:</strong> Если у вас есть код от существующей комнаты, введите его в поле и нажмите "Войти". Код не чувствителен к регистру.
                </li>
              </ul>
            </div>

            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Жизненный цикл комнат</h3>
                <p>
                Комнаты и сообщения в них не хранятся вечно. Чтобы избежать накопления старых данных, любой участник может удалить комнату, но только при условии, что он остался в ней последним. Для этого нажмите на иконку корзины в левом верхнем углу комнаты.
                </p>
            </div>
            
            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Работа с сообщениями</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Отправка:</strong> Введите текст в поле внизу экрана и нажмите "Enter" (без Shift) или кнопку с иконкой самолётика.
                    </li>
                     <li>
                        <strong>Загрузка изображений:</strong> Нажмите на иконку скрепки, чтобы выбрать и прикрепить изображение к вашему сообщению. Вы можете отправить изображение как с текстом, так и без него.
                    </li>
                    <li>
                        <strong>Перемещение:</strong> Наведите курсор на левую часть карточки (где иконка с точками), зажмите левую кнопку мыши и перетаскивайте. Работает только для ваших собственных сообщений.
                    </li>
                    <li>
                        <strong>Изменение размера:</strong> Потяните за правый нижний угол карточки, чтобы изменить её размер. Работает только для ваших собственных сообщений.
                    </li>
                    <li>
                        <strong>Сворачивание:</strong> Кликните по иконке перетаскивания, чтобы свернуть или развернуть карточку.
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Форматирование текста</h3>
              <p className="mb-2">
                Вы можете форматировать текст, используя специальные символы разметки:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pr-4">Стиль</th>
                            <th className="py-2 pr-4">Разметка</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><strong>Жирный</strong></td>
                            <td className="py-2 pr-4 font-mono">*текст*</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><em>Курсив</em></td>
                            <td className="py-2 pr-4 font-mono">\текст\</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><u>Подчеркнутый</u></td>
                            <td className="py-2 pr-4 font-mono">_текст_</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><s>Зачеркнутый</s></td>
                            <td className="py-2 pr-4 font-mono">$текст$</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4">Скрытый (спойлер)</td>
                            <td className="py-2 pr-4 font-mono">#текст#</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><a href="#" className="text-blue-500 hover:underline" onClick={(e)=>e.preventDefault()}>Ссылка</a></td>
                            <td className="py-2 pr-4 font-mono">{'@текст@{ссылка}'}</td>
                        </tr>
                    </tbody>
                </table>
              </div>
              <p className="pt-4">
                Также, если вы напишете <code>&lt;3</code>, окруженное пробелами, оно автоматически превратится в ❤️.
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
            <DialogClose asChild>
              <Button type="button">Закрыть</Button>
            </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

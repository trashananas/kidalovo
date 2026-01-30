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
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          Руководство
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Руководство по "Kidalovo"</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <div className="space-y-6 text-sm text-foreground">
            <div>
              <h2 className="font-semibold text-lg mb-2">Добро пожаловать!</h2>
              <p>
                "Kidalovo" — это интерактивная доска для совместной работы в реальном времени. Создавайте комнаты, приглашайте друзей и обменивайтесь идеями с помощью текстовых карточек, файлов и векторных рисунков.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Начало работы</h3>
              <p className="mb-2">
                На главной странице у вас есть два варианта:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Создать новую комнату:</strong> Анонимные пользователи могут создать комнату со случайным кодом (4 символа). <b>Кастомный код</b> (от 5 до 10 символов) доступен только после входа в аккаунт. Также можно сделать комнату <b>приватной</b>, установив пароль.
                </li>
                <li>
                  <strong>Войти в комнату:</strong> Введите код (от 4 до 10 символов). Поле не чувствительно к регистру и автоматически исправляет неправильную раскладку клавиатуры.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Приватность и доступ</h3>
              <p>
                Если комната защищена паролем, посетители должны будут ввести его. Для <b>авторизованных пользователей</b>, которые уже входили в комнату или создали её, доступ сохраняется автоматически — вводить пароль повторно не потребуется.
              </p>
            </div>
            
            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Работа с сообщениями</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Отправка:</strong> Введите текст в поле внизу и нажмите "Enter".
                    </li>
                     <li>
                        <strong>Файлы:</strong> Иконка скрепки позволяет прикреплять изображения и документы. Изображения отображаются сразу на карточке.
                    </li>
                    <li>
                        <strong>Управление:</strong> Справа вверху на каждой карточке находятся кнопки:
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li><b>Копировать:</b> Текст сообщения в буфер обмена.</li>
                          <li><b>Изменить:</b> Редактирование текста (доступно автору и владельцу комнаты).</li>
                          <li><b>Удалить:</b> Удаление карточки (требуется <b>двойной клик</b> для подтверждения).</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Манипуляции:</strong> Перетаскивайте карточку за иконку слева, меняйте размер за правый нижний угол или сворачивайте её кликом по иконке перемещения.
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Рисование на доске</h3>
              <p className="mb-2">
                Используйте инструменты рисования для визуализации идей.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><b className="font-mono">Выделить:</b> Позволяет выбирать объекты для перемещения, вращения или изменения формы за узловые точки.</li>
                <li><b className="font-mono">Перемещение:</b> Свободное движение по бесконечному холсту.</li>
                <li><b className="font-mono">Фигуры:</b> Перо, Стрелка, Прямоугольник, Эллипс и Треугольник.</li>
                <li><b className="font-mono">Ластик:</b> Быстрое удаление объектов с доски.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Форматирование текста</h3>
              <p className="mb-2">
                Используйте специальные символы для оформления текста:
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
                            <td className="py-2 pr-4">Спойлер</td>
                            <td className="py-2 pr-4 font-mono">#текст#</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4">Ссылка</td>
                            <td className="py-2 pr-4 font-mono">@текст@{"{url}"}</td>
                        </tr>
                    </tbody>
                </table>
              </div>
              <p className="pt-4">
                Комбинация <code>{"<3"}</code> автоматически превращается в яркое сердечко ❤️.
              </p>
            </div>
             <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Удаление комнат</h3>
                <p>
                Любой участник может удалить комнату, если он остался в ней <b>последним</b>. Создатель комнаты может удалить её в любой момент вместе со всем содержимым.
                </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
            <DialogClose asChild>
              <Button type="button">Понятно</Button>
            </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

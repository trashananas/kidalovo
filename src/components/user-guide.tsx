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
                  <strong>Создать новую комнату:</strong> Вы можете оставить поле кода пустым для случайного (4 символа) или задать свой <b>кастомный код</b> (от 5 до 10 символов). Также можно сделать комнату <b>приватной</b>, установив пароль.
                </li>
                <li>
                  <strong>Войти в комнату:</strong> Введите код (от 4 до 10 символов). Поле не чувствительно к регистру и автоматически переводит русскую раскладку в английскую.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Приватность и пароли</h3>
              <p>
                Если комната защищена паролем, каждый новый посетитель должен будет ввести его для доступа. Пароль сохраняется на время сессии в браузере, поэтому при обычном обновлении страницы вводить его повторно не потребуется.
              </p>
            </div>
            
            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Работа с сообщениями</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Отправка:</strong> Введите текст в поле внизу и нажмите "Enter" (без Shift).
                    </li>
                     <li>
                        <strong>Файлы:</strong> Иконка скрепки позволяет прикреплять файлы до 100 МБ. Изображения отображаются сразу.
                    </li>
                    <li>
                        <strong>Панель действий:</strong> Справа на каждой вашей карточке расположена вертикальная панель:
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li><b>Копировать:</b> Быстрое копирование текста в буфер обмена.</li>
                          <li><b>Изменить:</b> Редактирование текста сообщения.</li>
                          <li><b>Удалить:</b> Удаление сообщения (требует <b>двойного клика</b> в течение 0.5с).</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Манипуляции:</strong> Перетаскивайте карточку за иконку слева, меняйте размер за правый нижний угол или сворачивайте её кликом по иконке перетаскивания.
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Рисование на доске</h3>
              <p className="mb-2">
                Нажмите на иконку <b className="font-mono">Пера</b> сверху для входа в режим рисования.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><b className="font-mono">Выделить:</b> Позволяет выбирать объекты для перемещения, вращения или изменения формы за узловые точки.</li>
                <li><b className="font-mono">Перемещение:</b> Двигайте весь холст, зажав левую кнопку мыши.</li>
                <li><b className="font-mono">Фигуры:</b> Путь, Стрелка, Прямоугольник, Эллипс и Треугольник (ставится по 3 кликам).</li>
                <li><b className="font-mono">Ластик:</b> Удаление объектов по клику.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Форматирование текста</h3>
              <p className="mb-2">
                Используйте разметку или горячие клавиши:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pr-4">Стиль</th>
                            <th className="py-2 pr-4">Разметка</th>
                            <th className="py-2 pr-4">Горячая клавиша</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><strong>Жирный</strong></td>
                            <td className="py-2 pr-4 font-mono">*текст*</td>
                            <td className="py-2 pr-4 font-mono">Ctrl + B</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><em>Курсив</em></td>
                            <td className="py-2 pr-4 font-mono">\текст\</td>
                            <td className="py-2 pr-4 font-mono">Ctrl + I</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><u>Подчеркнутый</u></td>
                            <td className="py-2 pr-4 font-mono">_текст_</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + U</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><s>Зачеркнутый</s></td>
                            <td className="py-2 pr-4 font-mono">$текст$</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + Shift + X</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4">Спойлер</td>
                            <td className="py-2 pr-4 font-mono">#текст#</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + Shift + P</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4">Ссылка</td>
                            <td className="py-2 pr-4 font-mono">@текст@{"{url}"}</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + K</td>
                        </tr>
                    </tbody>
                </table>
              </div>
              <p className="pt-4">
                Комбинация <code>{"<3"}</code> автоматически превращается в ❤️.
              </p>
            </div>
             <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Удаление комнат</h3>
                <p>
                Любой участник может удалить комнату через иконку корзины в заголовке, но только если он остался в ней <b>последним</b>. Это помогает поддерживать порядок в базе данных.
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

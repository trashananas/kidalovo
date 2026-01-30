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
          <BookOpen />
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
                  <strong>Создать новую комнату:</strong> Нажмите на эту кнопку, и для вас будет сгенерирована уникальная комната с кодом из 4 символов. Вы можете задать свой код (от 5 до 10 символов) и установить пароль.
                </li>
                <li>
                  <strong>Войти в комнату:</strong> Если у вас есть код, введите его в поле и нажмите "Войти". Код не чувствителен к регистру и автоматически переключает раскладку с русской на английскую.
                </li>
              </ul>
            </div>
            
            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Работа с сообщениями</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Отправка:</strong> Введите текст в поле внизу экрана и нажмите "Enter" (без Shift) или кнопку отправки.
                    </li>
                     <li>
                        <strong>Прикрепление файлов:</strong> Нажмите на иконку скрепки. Изображения будут показаны прямо на карточке, а для других файлов будет ссылка на скачивание.
                    </li>
                    <li>
                        <strong>Перемещение:</strong> Наведите на иконку с точками в левой части карточки, зажмите и перетаскивайте. Работает только для ваших сообщений.
                    </li>
                    <li>
                        <strong>Изменение размера:</strong> Потяните за правый нижний угол карточки. Работает только для ваших сообщений.
                    </li>
                    <li>
                        <strong>Сворачивание:</strong> Кликните по иконке перетаскивания, чтобы свернуть или развернуть карточку.
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Рисование на доске</h3>
              <p className="mb-2">
                Чтобы начать рисовать, нажмите на кнопку с иконкой <b className="font-mono">Ручки</b> в левом верхнем углу. Это включит режим рисования и откроет панель инструментов.
              </p>
              <h4 className="font-semibold mt-4 mb-2">Панель инструментов</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><b className="font-mono">Выделить (Курсор):</b> Главный инструмент для работы с уже нарисованными фигурами. Позволяет выбирать, перемещать, вращать и изменять объекты.</li>
                <li><b className="font-mono">Перемещение (Рука):</b> Позволяет двигать всю доску (холст), зажав левую кнопку мыши.</li>
                <li><b className="font-mono">Ручка, Стрелка, Пнямоугольник, Эллипс, Треугольник:</b> Инструменты для создания соответствующих фигур.</li>
                <li><b className="font-mono">Ластик:</b> Позволяет удалить любой нарисованный объект по клику на него.</li>
                <li><b className="font-mono">Палитра и толщина:</b> Выбирайте цвет и толщину линии для всех инструментов рисования.</li>
              </ul>
              <h4 className="font-semibold mt-4 mb-2">Создание и редактирование фигур</h4>
                 <ul className="list-disc pl-5 space-y-2">
                    <li><b>Создание:</b>
                        <ul className="list-disc pl-5 mt-2">
                           <li><b>Линия/Стрелка:</b> Зажмите левую кнопку мыши и тяните.</li>
                           <li><b>Прямоугольник/Эллипс:</b> Тяните от одного угла к другому.</li>
                           <li><b>Треугольник:</b> Кликните три раза в разных местах, чтобы задать вершины.</li>
                        </ul>
                    </li>
                    <li><b>Редактирование (с помощью инструмента "Выделить"):</b>
                        <ul className="list-disc pl-5 mt-2">
                            <li><b>Выбор:</b> Кликните по фигуре, чтобы выбрать её. Появится рамка.</li>
                            <li><b>Перемещение:</b> Просто перетащите выделенную фигуру.</li>
                            <li><b>Изменение формы:</b> Потяните за любой из кружочков (вершин) на рамке, чтобы изменить форму объекта.</li>
                            <li><b>Вращение:</b> Потяните за маркер на "антенне", отходящей от рамки выделения, чтобы повернуть фигуру.</li>
                        </ul>
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Форматирование текста в сообщениях</h3>
              <p className="mb-2">
                Используйте символы разметки или горячие клавиши для форматирования:
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
                            <td className="py-2 pr-4">Скрытый (спойлер)</td>
                            <td className="py-2 pr-4 font-mono">#текст#</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + Shift + P</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 pr-4"><a href="#" className="text-blue-500 hover:underline" onClick={(e)=>e.preventDefault()}>Ссылка</a></td>
                            <td className="py-2 pr-4 font-mono">{'@текст@{ссылка}'}</td>
                             <td className="py-2 pr-4 font-mono">Ctrl + K</td>
                        </tr>
                    </tbody>
                </table>
              </div>
              <p className="pt-4">
                Также, если вы напишете <code>&lt;3</code>, окруженное пробелами, оно автоматически превратится в ❤️.
              </p>
            </div>
             <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Жизненный цикл комнат</h3>
                <p>
                Комнаты и их содержимое не хранятся вечно. Чтобы избежать накопления старых данных, любой участник может удалить комнату, но только при условии, что он остался в ней последним. Для этого нажмите на иконку корзины в левом верхнем углу комнаты.
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

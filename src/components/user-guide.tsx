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
                На главной странице у вас есть несколько вариантов создания доски:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Случайный код:</strong> Анонимные пользователи создают комнату со случайным кодом из 4 символов.
                </li>
                <li>
                  <strong>Кастомный код:</strong> Доступен только авторизованным пользователям (от 5 до 10 символов).
                </li>
                <li>
                  <strong>Только для авторизованных:</strong> Специальный режим доступа, при котором анонимные пользователи (без аккаунта) не смогут войти на доску.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Приватность и доступ</h3>
              <p className="mb-2">
                Безопасность ваших досок обеспечивается двумя уровнями защиты:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Пароль:</strong> Если установлен пароль, каждый новый посетитель должен будет его ввести. Авторизованные пользователи запоминаются системой после первого успешного входа.
                </li>
                <li>
                  <strong>Список участников (Audit Log):</strong> В комнатах «Только для авторизованных» первым сообщением всегда отображается список «Тут были...». В нем фиксируются никнеймы всех, кто когда-либо заходил на эту доску.
                </li>
              </ul>
            </div>
            
            <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Работа с сообщениями</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Отправка:</strong> Введите текст и нажмите "Enter". Система автоматически проверяет текст. Если сообщение содержит недопустимые слова (например, фамилию на букву «В»), оно будет заблокировано с ошибкой «nature error».
                    </li>
                     <li>
                        <strong>Файлы:</strong> Иконка скрепки позволяет прикреплять изображения. Они отображаются прямо на карточке.
                    </li>
                    <li>
                        <strong>Управление:</strong> Справа вверху на карточке доступны кнопки:
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li><b>Копировать:</b> Текст в буфер обмена.</li>
                          <li><b>Изменить:</b> Доступно автору и владельцу комнаты.</li>
                          <li><b>Удалить:</b> Требуется <b>двойной клик</b> для подтверждения.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Манипуляции:</strong> Перетаскивайте карточку за иконку слева, меняйте размер за правый нижний угол или сворачивайте её кликом.
                    </li>
                </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Рисование на доске</h3>
              <p className="mb-2">
                Используйте инструменты рисования для визуализации идей:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><b>Выделить:</b> Выбор объектов для перемещения, вращения или изменения формы за узловые точки.</li>
                <li><b>Перемещение:</b> Свободное движение по холсту (инструмент «Рука»).</li>
                <li><b>Фигуры:</b> Перо, Стрелка, Прямоугольник, Эллипс и Треугольник.</li>
                <li><b>Ластик:</b> Быстрое удаление объектов.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-md border-t pt-4 mb-2">Форматирование текста</h3>
              <p className="mb-2">
                Используйте разметку для оформления сообщений:
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
                    </tbody>
                </table>
              </div>
              <p className="pt-4">
                Комбинация <code>{"<3"}</code> превращается в ❤️.
              </p>
            </div>
             <div>
                <h3 className="font-semibold text-md border-t pt-4 mb-2">Удаление комнат</h3>
                <p>
                  Любой участник может удалить комнату, если он остался в ней <b>последним</b>. Создатель комнаты может удалить её в любой момент.
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

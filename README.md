# Kidalovo

Это стартовый проект для приложения "Kidalovo" — доски для сообщений в реальном времени, созданной в Firebase Studio.

## Развёртывание на Render (Рекомендуемый способ)

Мы используем сервис **Render** для хостинга. Он бесплатен, не требует привязки карты, обновляется из GitHub и стабильно работает в России.

**Шаг 1: Регистрация на Render**

1.  Перейдите на сайт [render.com](https://render.com/) и зарегистрируйтесь, используя ваш аккаунт GitHub.

**Шаг 2: Создание Web Service**

1.  В личном кабинете (Dashboard) нажмите **"New" -> "Web Service"**.
2.  В списке репозиториев найдите `kidalovo` и нажмите **"Connect"**.
3.  Настройте сервис:
    *   **Name:** `kidalovo` (или любое другое имя).
    *   **Root Directory:** Оставьте пустым.
    *   **Branch:** `main`.
    *   **Runtime:** `Node`. Render должен определить это автоматически.
    *   **Build Command:** `npm run build`.
    *   **Start Command:** `npm start`.
    *   **Plan:** Убедитесь, что выбран **Free**.

**Шаг 3: Добавление переменных окружения**

1.  Прокрутите страницу создания сервиса вниз до секции **"Environment"**.
2.  Нажмите **"Add Environment Variable"** и добавьте следующие три переменные, используя ваши ключи от Cloudinary:
    *   **Key:** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, **Value:** `ВАШ_CLOUD_NAME`
    *   **Key:** `CLOUDINARY_API_KEY`, **Value:** `ВАШ_API_KEY`
    *   **Key:** `CLOUDINARY_API_SECRET`, **Value:** `ВАШ_API_SECRET`
    
    _Вы можете также нажать "Add from .env" и вставить сразу весь блок текста, как в Vercel:_
    ```
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ВАШ_CLOUD_NAME
    CLOUDINARY_API_KEY=ВАШ_API_KEY
    CLOUDINARY_API_SECRET=ВАШ_API_SECRET
    ```

**Шаг 4: Развёртывание**

1.  Нажмите кнопку **"Create Web Service"** в самом низу страницы.
2.  Render начнёт сборку и развёртывание вашего приложения. Это займёт несколько минут.
3.  После завершения ваш сайт будет доступен по ссылке вида `https://kidalovo.onrender.com`.

**Используйте и делитесь только этой ссылкой (`.onrender.com`).** Она будет работать стабильно.

# Kidalovo - Image Upload App

Это простое веб-приложение для загрузки изображений. Оно построено с использованием Next.js, TypeScript, Tailwind CSS и Cloudinary для хранения изображений.

## Развертывание и запуск

Проект развернут с использованием двух сервисов для обхода потенциальных блокировок в России:

1.  **Vercel**: Основной хостинг для приложения.
2.  **Cloudflare Pages**: Прокси-сервер, который перенаправляет запросы на Vercel, обеспечивая доступ к приложению, если Vercel заблокирован.

**Основная ссылка для доступа (должна работать везде):** [https://kidalovo.pages.dev/](https://kidalovo.pages.dev/)

### Шаг 1: Настройка Vercel

1.  Создайте аккаунт на [Vercel](https://vercel.com/).
2.  Создайте новый проект, импортировав этот репозиторий из вашего GitHub.
3.  Vercel автоматически определит, что это Next.js проект.
4.  Перейдите в настройки проекта (**Settings** -> **Environment Variables**).
5.  Добавьте следующие переменные окружения, используя ваши ключи из Cloudinary:

    ```
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ВАШ_CLOUD_NAME
    CLOUDINARY_API_KEY=ВАШ_API_KEY
    CLOUDINARY_API_SECRET=ВАШ_API_SECRET
    ```
    Вы можете вставить этот блок текста целиком в поле "Key", и Vercel автоматически создаст три переменные.

6.  Сохраните переменные. Vercel автоматически начнет новое развертывание. После его завершения ваш сайт будет доступен по адресу `.vercel.app`.

### Шаг 2: Настройка Cloudflare Pages

1.  Создайте аккаунт на [Cloudflare](https://dash.cloudflare.com/).
2.  Перейдите в раздел **Workers & Pages**.
3.  Создайте новый проект (**Create application** -> **Pages** -> **Connect to Git**).
4.  Выберите тот же репозиторий из вашего GitHub.
5.  **ВАЖНО!** На шаге **Set up builds and deployments**:
    *   В поле **Framework preset** выберите **None**.
    *   Поле **Build command** оставьте **пустым**.
    *   Поле **Build output directory** оставьте **пустым**.
6.  Нажмите **Save and Deploy**.

Cloudflare развернет только прокси-функцию из папки `functions`. После завершения развертывания ваш сайт будет доступен по адресу `.pages.dev` и будет работать как зеркало для сайта на Vercel.

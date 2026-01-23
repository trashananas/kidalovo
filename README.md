# Kidalovo

Это стартовый проект для приложения "Kidalovo" — доски для сообщений в реальном времени, созданной в Firebase Studio.

## Развёртывание (Deployment)

Мы используем сервис **Render** для хостинга. Он предоставляет бесплатный тариф, не требует привязки банковской карты, стабильно работает в России и автоматически обновляется при изменениях в вашем репозитории GitHub.

### Шаг 1: Развёртывание на Render

1.  Перейдите на сайт [Render](https://dashboard.render.com/register) и зарегистрируйтесь, используя ваш аккаунт GitHub.
2.  В личном кабинете нажмите **"New + -> Web Service"**.
3.  Найдите в списке ваш репозиторий `kidalovo` и нажмите **"Connect"**.
4.  На странице настроек заполните поля:
    *   **Name**: `kidalovo` (или любое другое имя на ваш вкус).
    *   **Region**: Оставьте `Oregon (US West)` или выберите ближайший.
    *   **Branch**: `main`.
    *   **Runtime**: `Node`.
    *   **Build Command**: `npm run build`.
    *   **Start Command**: `npm run start`.
    *   **Instance Type**: `Free`.

5.  Прокрутите ниже до секции **"Environment"**. Нажмите **"Add Environment Variable"**. Вам нужно добавить три переменные, используя ваши ключи от Cloudinary.

    *   **Переменная 1:**
        *   **Key**: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
        *   **Value**: `ВАШ_CLOUD_NAME`
    *   **Переменная 2:**
        *   **Key**: `CLOUDINARY_API_KEY`
        *   **Value**: `ВАШ_API_KEY`
    *   **Переменная 3:**
        *   **Key**: `CLOUDINARY_API_SECRET`
        *   **Value**: `ВАШ_API_SECRET`
    
    > **Важно:** Вы также можете нажать **"Add Secret File"**, указать в качестве имени файла `.env` и вставить в поле содержимого сразу весь текст ниже, заменив значения на ваши. Это может быть удобнее.
    > ```.env
    > NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ВАШ_CLOUD_NAME
    > CLOUDINARY_API_KEY=ВАШ_API_KEY
    > CLOUDINARY_API_SECRET=ВАШ_API_SECRET
    > ```

6.  Прокрутите в самый низ и нажмите **"Create Web Service"**.

Render автоматически начнёт сборку и развёртывание вашего проекта. Первый запуск может занять несколько минут. После завершения ваш сайт будет доступен по ссылке вида `https://kidalovo.onrender.com`.

**Используйте и делитесь только этой ссылкой (`https://kidalovo.onrender.com`).** Она будет работать везде.

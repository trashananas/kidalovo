/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app),
 * возвращая пользователю ответ оттуда. Это позволяет обходить блокировки.
 */
export async function onRequest({ request }) {
  // Создаем новый URL, заменяя хост на целевой (Vercel).
  const url = new URL(request.url);
  url.hostname = 'kidalovo.vercel.app';

  // Создаем новый объект заголовков, копируя все изначальные.
  const headers = new Headers(request.headers);
  // Устанавливаем правильный заголовок Host. Это критически важно,
  // чтобы Vercel понял, какой сайт мы от него хотим.
  headers.set('Host', url.hostname);

  // Выполняем запрос к Vercel с новым URL и правильными заголовками.
  // Метод (GET, POST и т.д.) и тело запроса сохраняются.
  return fetch(url.toString(), {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual', // Говорим fetch не следовать редиректам автоматически.
  });
}

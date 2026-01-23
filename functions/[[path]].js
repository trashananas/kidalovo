/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app),
 * возвращая пользователю ответ оттуда. Это позволяет обходить блокировки.
 */
export async function onRequest(context) {
  // Создаем новый URL на основе входящего запроса
  const url = new URL(context.request.url);

  // Устанавливаем хост, на который мы хотим проксировать запросы
  url.hostname = 'kidalovo.vercel.app';

  // Клонируем исходный запрос, но с новым URL
  const request = new Request(url, context.request);
  
  // ВАЖНО: Устанавливаем заголовок Host, чтобы он соответствовал целевому домену.
  // Vercel может отклонять запросы, если этот заголовок не совпадает.
  request.headers.set('host', url.hostname);

  // Выполняем запрос к целевому серверу (Vercel) и возвращаем его ответ
  return fetch(request);
}

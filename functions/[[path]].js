/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app),
 * возвращая пользователю ответ оттуда. Это позволяет обходить блокировки.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Целевой URL на Vercel
  const vercelUrl = new URL('https://kidalovo.vercel.app');
  vercelUrl.pathname = url.pathname;
  vercelUrl.search = url.search;

  // Создаем новый объект заголовков, копируя изначальные.
  const requestHeaders = new Headers(request.headers);
  
  // Устанавливаем правильный заголовок Host. Это критически важно.
  requestHeaders.set('Host', 'kidalovo.vercel.app');
  
  // Перенаправляем запрос на Vercel со всеми данными.
  return fetch(vercelUrl.toString(), {
    method: request.method,
    headers: requestHeaders,
    body: request.body,
    redirect: 'manual' // Позволяем клиенту обрабатывать редиректы
  });
}

/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app).
 * 
 * Ключевое исправление: мы принудительно устанавливаем заголовок 'Host',
 * чтобы Vercel понимал, какому сайту адресован запрос.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Задаем целевой хост
  const targetHost = 'kidalovo.vercel.app';
  url.hostname = targetHost;

  // Создаем копию заголовков, чтобы их можно было изменять
  const headers = new Headers(request.headers);
  // Устанавливаем правильный 'Host' для Vercel
  headers.set('Host', targetHost);
  
  // Создаем новый запрос с измененным URL и заголовками
  const newRequest = new Request(url.toString(), {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual', // Рекомендуется для прокси, чтобы избежать неожиданных редиректов
  });

  // Выполняем запрос к Vercel и возвращаем ответ
  return fetch(newRequest);
}

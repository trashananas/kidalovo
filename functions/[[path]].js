/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app),
 * возвращая пользователю ответ оттуда. Это позволяет обходить блокировки.
 */
export async function onRequest({ request }) {
  const url = new URL(request.url);

  // Устанавливаем хост, на который мы хотим проксировать запросы
  url.hostname = 'kidalovo.vercel.app';
  url.protocol = 'https'; // Убедимся, что используем HTTPS

  // Создаем новый объект Headers и копируем заголовки из исходного запроса
  const newHeaders = new Headers(request.headers);
  
  // Устанавливаем правильный заголовок Host. Это критически важно,
  // чтобы Vercel понял, для какого сайта предназначен запрос.
  newHeaders.set('Host', url.hostname);

  // Создаем новый запрос к целевому серверу
  const newRequest = new Request(url.toString(), {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'manual', // Обрабатываем редиректы вручную, чтобы избежать проблем
  });

  // Выполняем запрос к целевому серверу
  const response = await fetch(newRequest);
  
  // Создаем новый ответ, чтобы можно было изменить заголовки
  const newResponse = new Response(response.body, response);

  // Удаляем заголовки, которые могут мешать безопасности или кешированию
  newResponse.headers.delete('X-Frame-Options');
  newResponse.headers.delete('Content-Security-Policy');

  return newResponse;
}

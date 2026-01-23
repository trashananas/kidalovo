/**
 * Это прокси-функция Cloudflare Pages.
 * Она перехватывает все запросы к этому сайту (kidalovo.pages.dev)
 * и перенаправляет их на основной рабочий сайт (kidalovo.vercel.app),
 * возвращая пользователю ответ оттуда. Это позволяет обходить блокировки.
 */
export async function onRequest(context) {
  // 1. Создаем URL для целевого сервера (Vercel)
  const url = new URL(context.request.url);
  const vercelHost = 'kidalovo.vercel.app';
  url.hostname = vercelHost;

  // 2. Создаем новый запрос, клонируя исходный, но с новым URL
  const request = new Request(url, context.request);

  // 3. **КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:** Принудительно устанавливаем заголовок 'Host'.
  //    Это говорит серверу Vercel, что запрос предназначен именно для него,
  //    устраняя возможные конфликты.
  request.headers.set('Host', vercelHost);

  // 4. Выполняем запрос и возвращаем ответ без изменений
  return fetch(request);
}

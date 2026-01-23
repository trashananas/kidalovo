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

  // Создаем новый объект запроса, сохраняя все исходные данные
  // (метод, заголовки, тело), но с новым URL
  const newRequest = new Request(url.toString(), context.request);

  // Выполняем запрос к целевому серверу и возвращаем его ответ
  return fetch(newRequest);
}

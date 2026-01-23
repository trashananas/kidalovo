export async function onRequest(context) {
  // Создаем URL на основе входящего запроса
  const url = new URL(context.request.url);

  // Меняем хост на ваш рабочий домен в Vercel
  url.hostname = 'kidalovo.vercel.app';

  // Делаем запрос на Vercel, полностью сохраняя исходный запрос (метод, заголовки, тело),
  // и сразу же возвращаем ответ оттуда.
  return fetch(url.toString(), context.request);
}

/**
 * Cloudflare Pages function to act as a proxy.
 * It forwards all incoming requests to the Vercel deployment.
 *
 * This is the final, simplified, and correct version.
 */
export async function onRequest({ request }) {
  const url = new URL(request.url);
  url.hostname = 'kidalovo.vercel.app';
  return fetch(url, request);
}

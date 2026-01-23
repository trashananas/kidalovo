/**
 * Cloudflare Pages function to act as a proxy.
 * It forwards all incoming requests to the Vercel deployment.
 */
export async function onRequest(context) {
  // The base URL of your Vercel deployment
  const vercelUrl = 'https://kidalovo.vercel.app';

  // Get the original request URL
  const url = new URL(context.request.url);

  // Create the new URL for the Vercel backend
  const proxyUrl = new URL(url.pathname + url.search, vercelUrl);

  // Forward the request to Vercel, using the original request's properties
  return fetch(proxyUrl.toString(), context.request);
}

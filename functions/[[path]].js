/**
 * Cloudflare Pages function to act as a proxy.
 * It forwards all incoming requests to the Vercel deployment.
 *
 * NOTE: This is the corrected version that properly forwards the request.
 */
export async function onRequest(context) {
  // The base URL of your Vercel deployment
  const vercelUrl = 'https://kidalovo.vercel.app';

  // Get the original request URL from the context
  const url = new URL(context.request.url);

  // Construct the new URL for the Vercel backend
  const proxyUrl = new URL(url.pathname + url.search, vercelUrl);

  // Create a new Request object, cloning the original request's properties
  // but targeting the new proxy URL. This is the crucial step.
  const newRequest = new Request(proxyUrl, context.request);

  // Forward the new request to Vercel.
  // The 'fetch' API will handle headers, method, body, etc. correctly.
  return fetch(newRequest);
}

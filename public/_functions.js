// This Cloudflare Pages function will proxy all requests to your Vercel deployment.

export async function onRequest(context) {
  // The Vercel deployment URL that you want to proxy.
  // IMPORTANT: Make sure this is the correct URL of your Vercel deployment.
  const vercelUrl = 'https://kidalovo.vercel.app/';

  // Get the original request's URL
  const url = new URL(context.request.url);

  // Construct the new URL by replacing the Cloudflare domain with the Vercel domain.
  const newUrl = new URL(url.pathname + url.search, vercelUrl);

  // Create a new request object with the same properties as the original, but with the new URL.
  const newRequest = new Request(newUrl, context.request);

  // Make the fetch request to the Vercel deployment.
  // The response from Vercel will be streamed back to the user.
  return fetch(newRequest);
}

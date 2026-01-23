// Simple reverse proxy to Vercel
// This is the official, recommended way to do this.

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  
  // The origin server
  url.hostname = 'kidalovo.vercel.app';

  // Cloudflare will stream the response from the origin to the client.
  // It automatically handles the Host header and other details.
  return fetch(url.toString(), context.request);
};

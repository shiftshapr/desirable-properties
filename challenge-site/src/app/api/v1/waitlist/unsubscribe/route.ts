import { leaveWaitlist } from '@/lib/dp-book-waitlist';

function page(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} – Desirable Properties</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1a2332}a{color:#0369a1}</style>
</head>
<body><h1>${title}</h1><p>${message}</p><p><a href="/">Return to Desirable Properties</a></p></body>
</html>`;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const ok = await leaveWaitlist(token);
  const html = ok
    ? page('Unsubscribed', 'You will not get the Version 1.0 launch email.')
    : page('Could not unsubscribe', 'This link is not valid any more. If you keep getting email, reply to it and we will remove you.');
  return new Response(html, { status: ok ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

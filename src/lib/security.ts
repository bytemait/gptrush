export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Browser writes require an Origin header. Require it rather than treating missing as trusted.
  if (!origin) return false;
  try {
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin;
    return new URL(origin).origin === expected;
  } catch { return false; }
}

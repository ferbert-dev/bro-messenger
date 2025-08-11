export function authHeader(token?: string) {
  const t = token;
  return { Authorization: `Bearer ${t}` };
}

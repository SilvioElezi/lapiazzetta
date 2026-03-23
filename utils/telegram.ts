export const TELEGRAM_USER = "SilvioElezi";

export function buildTelegramOrder(text: string) {
  const base = `https://t.me/${TELEGRAM_USER}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

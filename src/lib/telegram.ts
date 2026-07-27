// Thin Telegram Bot API wrapper. All outbound messages go through sendMessage.
const API = "https://api.telegram.org";

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export async function sendMessage(
  chatId: string,
  text: string,
): Promise<boolean> {
  const token = botToken();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Point Telegram at our webhook. Call once after the domain is live. */
export async function setWebhook(url: string, secret: string) {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`${API}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret }),
  });
  return res.json();
}

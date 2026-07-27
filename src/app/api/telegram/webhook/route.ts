import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram";
import { handleCommand } from "@/lib/telegram-commands";

export const runtime = "nodejs";

// Inbound Telegram updates. Verified by the secret header (spec §8), and we
// only act on the one chat we're linked to.
export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message ?? update?.edited_message;
  const chatId = msg?.chat?.id ? String(msg.chat.id) : null;
  const text: string = msg?.text ?? "";
  if (!chatId) return NextResponse.json({ ok: true });

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // First contact links the chat.
  if (!settings.telegramChatId) {
    await prisma.settings.update({
      where: { id: "singleton" },
      data: { telegramChatId: chatId },
    });
    await sendMessage(chatId, "Linked ✓ You'll get session reminders and recaps here. Try /today");
    return NextResponse.json({ ok: true });
  }

  // Ignore anyone who isn't the linked owner.
  if (settings.telegramChatId !== chatId) {
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/")) {
    const reply = await handleCommand(text);
    await sendMessage(chatId, reply);
  }
  return NextResponse.json({ ok: true });
}

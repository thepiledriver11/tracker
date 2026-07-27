import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/api";

export const runtime = "nodejs";

// Delete a session and its set logs (cascade). Used by both "cancel & discard"
// on the active screen and "delete" on past sessions.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  await prisma.session.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

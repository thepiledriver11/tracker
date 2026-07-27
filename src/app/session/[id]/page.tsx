import { notFound } from "next/navigation";
import { getSessionForLogging } from "@/lib/session-loader";
import { ActiveSession } from "@/components/ActiveSession";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionForLogging(id);
  if (!session) notFound();
  return <ActiveSession session={session} />;
}

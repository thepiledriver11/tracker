import { getBodyData } from "@/lib/body";
import { BodyClient } from "@/components/BodyClient";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const data = await getBodyData();
  return <BodyClient data={data} initialTab="measurements" />;
}

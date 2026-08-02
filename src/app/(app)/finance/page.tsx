import { getFinanceData } from "@/lib/finance";
import { FinanceClient } from "@/components/FinanceClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const data = await getFinanceData();
  return <FinanceClient data={data} />;
}

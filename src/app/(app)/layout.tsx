import { TabBar } from "@/components/TabBar";
import { InstallHint } from "@/components/InstallHint";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-5 pb-28 pt-12">
      {children}
      <TabBar />
      <InstallHint />
    </div>
  );
}

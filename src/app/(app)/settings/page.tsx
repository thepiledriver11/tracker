import { getSettings, getNutritionTarget } from "@/lib/queries";
import { sydneyISODate } from "@/lib/time";
import { botToken } from "@/lib/telegram";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const target = await getNutritionTarget(sydneyISODate());
  return (
    <SettingsClient
      settings={{
        telegramChatId: settings.telegramChatId,
        morningPingAt: settings.morningPingAt,
        eveningNudgeAt: settings.eveningNudgeAt,
        gymMode: settings.gymMode,
        notifyMorning: settings.notifyMorning,
        notifyNudge: settings.notifyNudge,
        notifyPr: settings.notifyPr,
        notifyRecap: settings.notifyRecap,
      }}
      target={
        target
          ? {
              calories: target.calories,
              proteinG: target.proteinG,
              carbsG: target.carbsG,
              fatG: target.fatG,
            }
          : null
      }
      botLinked={!!botToken()}
    />
  );
}

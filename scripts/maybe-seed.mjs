// Optional one-shot seed at container start. Set SEED_ON_START=1 for the FIRST
// deploy (empty database), then remove it — the program seed rebuilds itself
// each run and would wipe manual program edits if left on.
import { execSync } from "node:child_process";

if (process.env.SEED_ON_START === "1") {
  console.log("SEED_ON_START=1 — seeding the program…");
  execSync("npm run seed", { stdio: "inherit" });
  console.log("Seed complete. Remove SEED_ON_START now so future deploys skip it.");
} else {
  console.log("SEED_ON_START not set — skipping seed.");
}

// Generate a bcrypt hash for APP_PIN_HASH.
//   npx tsx scripts/hash-pin.ts 1234
import bcrypt from "bcryptjs";

const pin = process.argv[2];
if (!pin) {
  console.error("Usage: npx tsx scripts/hash-pin.ts <pin>");
  process.exit(1);
}
bcrypt.hash(pin, 10).then((h) => {
  console.log(h);
});

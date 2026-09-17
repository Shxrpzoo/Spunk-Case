import { AshMouth } from "./ash-mouth";
import { PremiumCase } from "./premium-case";

export function CustomCase({
  ash = false,
  satchel = false,
  opening = false,
}: {
  ash?: boolean;
  satchel?: boolean;
  opening?: boolean;
}) {
  if (ash && !satchel) return <AshMouth opening={opening} />;
  return <PremiumCase satchel={satchel} opening={opening} />;
}

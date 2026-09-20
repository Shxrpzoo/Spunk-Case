import { AshMouth } from "./ash-mouth";
import { PremiumCase } from "./premium-case";
import { GoonCase } from "./goon-case";

export function CustomCase({
  ash = false,
  satchel = false,
  opening = false,
  goon = false,
}: {
  ash?: boolean;
  satchel?: boolean;
  opening?: boolean;
  goon?: boolean;
}) {
  if (goon) return <GoonCase opening={opening} />;
  if (ash && !satchel) return <AshMouth opening={opening} />;
  return <PremiumCase satchel={satchel} opening={opening} />;
}

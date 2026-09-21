import { AshMouth } from "./ash-mouth";
import { PremiumCase } from "./premium-case";
import { GoonCase } from "./goon-case";

export function CustomCase({
  ash = false,
  satchel = false,
  opening = false,
  goon = false,
  epipen = false,
}: {
  ash?: boolean;
  satchel?: boolean;
  opening?: boolean;
  goon?: boolean;
  epipen?: boolean;
}) {
  if (goon || epipen) return <GoonCase opening={opening} epipen={epipen} />;
  if (ash && !satchel) return <AshMouth opening={opening} />;
  return <PremiumCase satchel={satchel} opening={opening} />;
}

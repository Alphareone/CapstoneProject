const STREET_VIEW_BY_PREFIX: Array<[string, string]> = [
  ["124 ALBEMARLE", "/properties/124-albemarle.png"],
  ["11 TRENT", "/properties/11-trent.png"],
  ["114 MERCER", "/properties/114-mercer.png"],
  ["2465 PENNINGTON", "/properties/2465-pennington.png"],
  ["229 MOUNT LUCAS", "/properties/229-mount-lucas.png"],
  ["84 LAMBERTVILLE", "/properties/84-lambertville-hopewell.png"],
  ["4216 NOTTINGHAM", "/properties/4216-nottingham.png"],
  ["739 WILLIAM", "/properties/739-william.png"],
  ["121 PALMER", "/properties/121-palmer.png"],
  ["267 HOMECREST", "/properties/267-homecrest.png"],
  ["2082 PENNINGTON", "/properties/2082-pennington.png"],
  ["200 KING", "/properties/200-king.png"],
  ["37 EWINGVILLE", "/properties/37-ewingville.png"],
  ["93 JACOBS CREEK", "/properties/93-jacobs-creek.png"],
  ["345 GREEN LANE", "/properties/345-green-lane.png"],
  ["66 JACOBS CREEK", "/properties/66-jacobs-creek.png"],
  ["99 WEST STREET", "/properties/99-west-street.png"],
  ["74 LOUISE LANE", "/properties/74-louise-lane.png"],
  ["71 HARDWICK", "/properties/71-hardwick.png"],
  ["183 HOLLOW BROOK", "/properties/183-hollow-brook.png"],
];

export function getRealStreetViewPhoto(address?: string | null): string | null {
  if (!address) return null;
  const up = address.toUpperCase();
  for (const [prefix, path] of STREET_VIEW_BY_PREFIX) {
    if (up.includes(prefix)) return path;
  }
  return null;
}
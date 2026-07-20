// 18 distinct background colors — dark/black text stays readable on all.
export const PALETTE = [
  '#F8B4B4', // red (pastel)
  '#FBD38D', // orange (pastel)
  '#FAF089', // yellow (pastel)
  '#9AE6B4', // green (pastel)
  '#81E6D9', // teal (pastel)
  '#90CDF4', // blue (pastel)
  '#A3BFFA', // indigo (pastel)
  '#D6BCFA', // purple (pastel)
  '#FBB6CE', // pink (pastel)
  '#FF1A1A', // red (vivid)
  '#FF8C1A', // orange (vivid)
  '#FFD91A', // yellow (vivid)
  '#1AFF66', // green (vivid)
  '#1AFFC9', // teal (vivid)
  '#1A98FF', // blue (vivid)
  '#5C77FF', // indigo (vivid)
  '#A64CFF', // purple (vivid)
  '#FF1A8C', // pink (vivid)
]

// Pick the first palette color not already used by an existing member.
export function nextColor(members) {
  const used = new Set(members.map((m) => m.color))
  return PALETTE.find((c) => !used.has(c)) || PALETTE[members.length % PALETTE.length]
}

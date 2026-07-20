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
  '#FB6F6F', // red (vivid)
  '#FFA94D', // orange (vivid)
  '#FFE066', // yellow (vivid)
  '#51CF66', // green (vivid)
  '#38D9C9', // teal (vivid)
  '#4DABF7', // blue (vivid)
  '#7C93F5', // indigo (vivid)
  '#B197FC', // purple (vivid)
  '#F783AC', // pink (vivid)
]

// Pick the first palette color not already used by an existing member.
export function nextColor(members) {
  const used = new Set(members.map((m) => m.color))
  return PALETTE.find((c) => !used.has(c)) || PALETTE[members.length % PALETTE.length]
}

// 9 distinct, light background colors — dark/black text stays readable on all.
export const PALETTE = [
  '#F8B4B4', // red
  '#FBD38D', // orange
  '#FAF089', // yellow
  '#9AE6B4', // green
  '#81E6D9', // teal
  '#90CDF4', // blue
  '#A3BFFA', // indigo
  '#D6BCFA', // purple
  '#FBB6CE', // pink
]

// Pick the first palette color not already used by an existing member.
export function nextColor(members) {
  const used = new Set(members.map((m) => m.color))
  return PALETTE.find((c) => !used.has(c)) || PALETTE[members.length % PALETTE.length]
}

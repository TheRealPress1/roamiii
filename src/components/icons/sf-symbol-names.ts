// All available SF Symbol names
export const SF_SYMBOL_NAMES = [
  // Vibes
  'party.popper.fill',
  'leaf.fill',
  'figure.hiking',
  'building.columns.fill',
  'tree.fill',
  'sparkle',
  'beach.umbrella.fill',
  'building.2.fill',
  'fork.knife',
  'heart.fill',

  // Proposal Types
  'house.fill',
  'target',
  'globe.europe.africa.fill',

  // Phases
  'list.bullet.clipboard.fill',
  'checkmark.circle.fill',

  // Reactions
  'hand.thumbsup.fill',
  'hand.thumbsdown.fill',
  'flame.fill',

  // Votes
  'questionmark.circle.fill',
  'xmark.circle.fill',

  // Cover Presets
  'figure.skiing.downhill',
  'ferry.fill',
  'mountain.2.fill',
  'car.fill',
  'castle.fill',

  // Misc
  'lock.open.fill',
  'mappin.circle.fill',
  'bubble.left.fill',
  'square.stack.3d.up.fill',
] as const;

export type SFSymbolName = typeof SF_SYMBOL_NAMES[number];

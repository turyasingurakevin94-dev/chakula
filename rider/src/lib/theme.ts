// Direction A, "Warm Editorial". Values match the Chakula Rider design canvas.
export const colors = {
  forest: '#1B4332',
  orange: '#FF6B35',
  // Orange is too light for small text on cream; use this for orange copy under 24px.
  orangeText: '#B8441A',
  cream: '#FFF8F0',
  card: '#FFFFFF',
  line: '#EFE3D3',
  lineSoft: '#F3EADF',
  ink: '#2B2B26',
  muted: '#6B6A63',
  peach: '#FFE4D6',
  sage: '#E3EBDD',
  sand: '#F4E7C5',
  map: '#E9E1D3',
  track: '#E9DECF',
  // Premium redesign tokens, from the canvas boards.
  sub: '#8C8579',
  border: '#E2D4C1',
  divider: '#EADFCF',
  food: '#EAE0D2',
  tile: '#F1E8DC',
  well: '#F6EFE5',
  highlight: '#FFF4EC',
  green: '#2F6B4A',
  forestMid: '#24573F',
  forestDeep: '#0F2A1F',
  forestLine: '#3C6B55',
  mint: '#CFE0D3',
  peachText: '#FFB48F',
  heroMeta: '#E7DCCB',
  chevron: '#B5AA9A',
  // Kitchen canvas tokens.
  segment: '#F3EADF',
  segmentText: '#4A4943',
  toggleOff: '#DCCFBD',
  chipBg: '#FFE8DC',
  chipText: '#8A3412',
  noteBg: '#F3EADF',
  // Rider canvas tokens.
  body: '#4A4943',
  online: '#2E9E5B',
  sealed: '#2E7D4F',
  danger: '#B42318',
  barDone: '#D7E3D2',
  mapGround: '#EFE8DC',
  mapBlock: '#E3D9CA',
  mapGreen: '#D7E3D2',
  onForest: '#E7EFE9',
  viewfinder: '#16221C',
  viewfinderLight: '#3A4A42',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  // For the one italic word in a headline, e.g. "Breakfast, *sorted.*"
  displayItalic: 'Fraunces_500Medium_Italic',
  // Titles laid over food pictures.
  displayLight: 'Fraunces_400Regular',
  displayMedium: 'Fraunces_500Medium',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 22 } as const;

export const shadow = {
  shadowColor: colors.forest,
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

// 11px small caps, used for section labels (as on the rider design canvas).
export const smallCaps = { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.54, textTransform: 'uppercase', color: '#6B6A63' } as const;

export function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

// 31000 -> "31,000"
export function money(amount: number) {
  return amount.toLocaleString('en-US');
}

// Direction A, "Warm Editorial". Values match the style guide board on the design canvas.
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
  map: '#F1E6D6',
  track: '#E9DECF',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 22 } as const;

export const shadow = {
  shadowColor: colors.forest,
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
} as const;

export function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

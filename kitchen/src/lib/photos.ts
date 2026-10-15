import type { ImageSourcePropType } from 'react-native';

// Stand-in kitchen photos (Unsplash License, photographer per line) until kitchens upload their own.
// Katogo is left out on purpose: the Menu tab shows it as the dish still missing a photo.
const byName: Record<string, ImageSourcePropType> = {
  'Chicken pilau': require('../../assets/food/pilau.jpg'), // Eugene Krasnaok
  'Beef luwombo': require('../../assets/food/luwombo.jpg'), // Nathan Dumlao
  'Beef stew & matooke': require('../../assets/food/luwombo.jpg'),
  'Special rolex': require('../../assets/food/rolex-special.jpg'), // nrd
  'Passion juice': require('../../assets/food/passion.jpg'), // Kul Ponmongkolchat
  Soda: require('../../assets/food/soda.jpg'), // Qasim Malick
};

export function photoFor(name: string): ImageSourcePropType | undefined {
  return byName[name];
}

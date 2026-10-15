// Food photos from Unsplash, free to use under the Unsplash License. Each line names the photographer.
// Stand-ins until kitchens upload photos of their own dishes from the vendor app.
export const photos = {
  pilau: require('../../assets/food/pilau.jpg'), // Eugene Krasnaok
  'rice-pan': require('../../assets/food/rice-pan.jpg'), // Keesha's Kitchen
  spread: require('../../assets/food/spread.jpg'), // Keesha's Kitchen
  luwombo: require('../../assets/food/luwombo.jpg'), // Nathan Dumlao
  'chicken-luwombo': require('../../assets/food/chicken-luwombo.jpg'), // yvonne lee harijanto
  katogo: require('../../assets/food/katogo.jpg'), // Laura Ohlman
  rolex: require('../../assets/food/rolex.jpg'), // tommao wang
  'rolex-special': require('../../assets/food/rolex-special.jpg'), // nrd
  chapati: require('../../assets/food/chapati.jpg'), // Mugabi Owen
  passion: require('../../assets/food/passion.jpg'), // Kul Ponmongkolchat
  tea: require('../../assets/food/tea.jpg'), // Salar Arif
  bowl: require('../../assets/food/bowl.jpg'), // joe boshra
  'bowl-chicken': require('../../assets/food/bowl-chicken.jpg'), // joe boshra
  mango: require('../../assets/food/mango.jpg'), // Julia Zyablova
  'chips-chicken': require('../../assets/food/chips-chicken.jpg'), // Andy Wang
  'chicken-basket': require('../../assets/food/chicken-basket.jpg'), // Andy Wang
  'chips-sausage': require('../../assets/food/chips-sausage.jpg'), // Diego Arenas de Rodrigo
  soda: require('../../assets/food/soda.jpg'), // Qasim Malick
  muchomo: require('../../assets/food/muchomo.jpg'), // Hamid Roshaan
  skewers: require('../../assets/food/skewers.jpg'), // Mihir Sabnis
  pizza: require('../../assets/food/pizza.jpg'), // Chad Montano
  tilapia: require('../../assets/food/tilapia.jpg'), // lalo Hernandez
};

export type PhotoKey = keyof typeof photos;

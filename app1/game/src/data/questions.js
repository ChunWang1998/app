// 諧音梗題庫：picture1 給提示、picture2 為諧音變體，answer 為諧音答案。
// 圖片放在 assets/pictures/，命名為 1-1.jpg / 1-2.jpg / 2-1.jpg ...
export const questions = [
  {
    id: 1,
    type: '名詞',
    hintImage: require('../../assets/pictures/1-1.jpg'),
    hintText: '這是一隻麒麟',
    guessImage: require('../../assets/pictures/1-2.jpg'),
    answer: '冰淇淋',
    hint: '冰冰涼涼、夏天最愛的甜點',
  },
  {
    id: 2,
    type: '形容詞',
    hintImage: require('../../assets/pictures/2-1.jpg'),
    hintText: '這是一碗麵',
    guessImage: require('../../assets/pictures/2-2.jpg'),
    answer: '體面',
    hint: '穿得整齊好看、有面子',
  },
];

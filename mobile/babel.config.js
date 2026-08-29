module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo (SDK 54) react-native-worklets/plugin'i otomatik ekler —
  // burada tekrar eklemek plugin'i iki kez çalıştırır ve beyaz ekrana yol açar.
  return {
    presets: ["babel-preset-expo"],
  };
};

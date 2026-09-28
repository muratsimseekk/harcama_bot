const { withStringsXml, AndroidConfig } = require("@expo/config-plugins");

/**
 * Expo'nun `app.json`'daki "name" alanını Kotlin dosyalarının `package` satırı
 * için de kullandığı bir SDK 57 hatası var (name ≠ android.package sanitized
 * hâli olunca MainActivity.kt/MainApplication.kt yanlış package'a düşüyor,
 * "Unresolved reference 'R'/'BuildConfig'" derleme hatası veriyor).
 *
 * Çözüm: "name" alanını teknik olarak android.package'e uyumlu tut (bkz
 * app.json — "Harcama"), gerçek görünen ismi (Play Store launcher etiketi)
 * yalnızca strings.xml'deki app_name kaynağını burada elle üzerine yazarak
 * ayarla. iOS tarafı için aynı ayrım `ios.infoPlist.CFBundleDisplayName` ile
 * yapılıyor (app.json'da).
 */
module.exports = function withAndroidAppName(config, displayName) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: "app_name", translatable: "false" }, _: displayName }],
      config.modResults,
    );
    return config;
  });
};

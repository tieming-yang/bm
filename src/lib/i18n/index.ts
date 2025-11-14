import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { verifyTranslationEncoding } from "./encoding-utils";

// Import English translations
import enCommon from "./locales/en/common.json";
import enGallery from "./locales/en/gallery.json";
import enDonate from "./locales/en/donate.json";
import enContact from "./locales/en/contact.json";
import enUi from "./locales/en/ui.json";
import enSettings from "./locales/en/settings.json";
import enBooks from "./locales/en/books.json";
import enGloryShare from "./locales/en/glory-share.json";
import enDailyGraceSnacks from "./locales/en/daily-grace-snacks.json";
import enBeyondMusic from "./locales/en/beyond-music.json";

// Import Traditional Chinese translations
import zhCommon from "./locales/zh-TW/common.json";
import zhGallery from "./locales/zh-TW/gallery.json";
import zhDonate from "./locales/zh-TW/donate.json";
import zhContact from "./locales/zh-TW/contact.json";
import zhUi from "./locales/zh-TW/ui.json";
import zhSettings from "./locales/zh-TW/settings.json";
import zhBooks from "./locales/zh-TW/books.json";
import zhGloryShare from "./locales/zh-TW/glory-share.json";
import zhDailyGraceSnacks from "./locales/zh-TW/daily-grace-snacks.json";
import zhBeyondMusic from "./locales/zh-TW/beyond-music.json";

// Check for encoding issues in development
if (process.env.NODE_ENV !== "production") {
  console.log("[i18n] Verifying translation file encoding...");

  // Verify Chinese translations
  verifyTranslationEncoding(zhCommon, "zh-TW/common.json");
  verifyTranslationEncoding(zhGallery, "zh-TW/gallery.json");
  verifyTranslationEncoding(zhDonate, "zh-TW/donate.json");
  verifyTranslationEncoding(zhContact, "zh-TW/contact.json");
  verifyTranslationEncoding(zhUi, "zh-TW/ui.json");
  verifyTranslationEncoding(zhSettings, "zh-TW/settings.json");
  verifyTranslationEncoding(zhBooks, "zh-TW/books.json");
  verifyTranslationEncoding(zhGloryShare, "zh-TW/glory-share.json");
  verifyTranslationEncoding(zhDailyGraceSnacks, "zh-TW/daily-grace-snacks.json");
  verifyTranslationEncoding(zhBeyondMusic, "zh-TW/beyond-music.json");
}

// Initialize i18n instance
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        gallery: enGallery,
        donate: enDonate,
        contact: enContact,
        ui: enUi,
        settings: enSettings,
        books: enBooks,
        "glory-share": enGloryShare,
        "daily-grace-snacks": enDailyGraceSnacks,
        "beyond-music": enBeyondMusic,
      },
      "zh-TW": {
        common: zhCommon,
        gallery: zhGallery,
        donate: zhDonate,
        contact: zhContact,
        ui: zhUi,
        settings: zhSettings,
        books: zhBooks,
        "glory-share": zhGloryShare,
        "daily-grace-snacks": zhDailyGraceSnacks,
        "beyond-music": zhBeyondMusic,
      },
    },
    fallbackLng: "zh-TW",
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

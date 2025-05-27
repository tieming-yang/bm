"use client";

import { useTranslation as useI18nTranslation } from "react-i18next";

import { useEffect } from "react";

export const useTranslation = (namespace = "common") => {
  const { t, i18n } = useI18nTranslation(namespace);

  // Preload fonts when language changes
  useEffect(() => {
    // Dynamically load polyfill for language-specific font features if needed
    const lang = i18n.language;
    document.documentElement.lang = lang;

    // Force re-render of text with new font configuration
    document.body.style.opacity = "0.99";
    setTimeout(() => {
      document.body.style.opacity = "1";
    }, 50);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save language preference to localStorage
    localStorage.setItem("i18nextLng", lng);
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage,
  };
};

// For multi-namespace usage
export const useMultiTranslation = (namespaces: string[] = ["common"]) => {
  const { t, i18n } = useI18nTranslation(namespaces);

  // Preload fonts when language changes
  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.lang = lang;

    // Force re-render of text with new font configuration
    document.body.style.opacity = "0.99";
    setTimeout(() => {
      document.body.style.opacity = "1";
    }, 50);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage,
  };
};

export default useTranslation;

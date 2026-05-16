import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { AppLocale } from "../../store/slices/settingsSlice";
import { setLocale, setTheme } from "../../store/slices/settingsSlice";
import { useI18n } from "../../shared/i18n";
import "./PreferencesMenu.css";

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PreferencesMenu() {
  const dispatch = useAppDispatch();
  const { theme, locale } = useAppSelector((s) => s.settings);
  const { t } = useI18n();
  const isDark = theme === "dark";
  const nextLocale: AppLocale = locale === "en" ? "ru" : "en";
  const localeLabel = locale === "en" ? "eng" : "ru";

  return (
    <div className="preferences-menu" role="group" aria-label={t("preferences.theme")}>
      <button
        type="button"
        className={`topbar-icon-btn topbar-icon-btn--theme${isDark ? " is-dark-theme" : " is-light-theme"}`}
        onClick={() => dispatch(setTheme(isDark ? "light" : "dark"))}
        aria-label={isDark ? t("preferences.themeLight") : t("preferences.themeDark")}
        title={isDark ? t("preferences.themeLight") : t("preferences.themeDark")}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="topbar-lang-btn"
        onClick={() => dispatch(setLocale(nextLocale))}
        aria-label={t("preferences.language")}
        title={t("preferences.language")}
      >
        {localeLabel}
      </button>
    </div>
  );
}

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "dark" | "light";
export type AppLocale = "en" | "ru";

const STORAGE_KEY = "pm-app-settings";

export type AppSettings = {
  theme: ThemeMode;
  locale: AppLocale;
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  locale: "en",
};

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const theme = parsed.theme === "light" ? "light" : "dark";
    const locale = parsed.locale === "ru" ? "ru" : "en";
    return { theme, locale };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applySettingsToDocument(settings: AppSettings): void {
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.documentElement.lang = settings.locale;
}

const initialSettings = readStoredSettings();
applySettingsToDocument(initialSettings);

const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettings,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      persistSettings(state);
      applySettingsToDocument(state);
    },
    setLocale(state, action: PayloadAction<AppLocale>) {
      state.locale = action.payload;
      persistSettings(state);
      applySettingsToDocument(state);
    },
    setSettings(state, action: PayloadAction<AppSettings>) {
      state.theme = action.payload.theme;
      state.locale = action.payload.locale;
      persistSettings(state);
      applySettingsToDocument(state);
    },
  },
});

export const { setTheme, setLocale, setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

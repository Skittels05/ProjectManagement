import { useMemo } from "react";
import { useAppSelector } from "../../store/hooks";
import type { TaskStatus } from "../../store/types/tasks.types";
import type { AppLocale } from "../../store/slices/settingsSlice";
import { en, type TranslationSchema } from "./en";
import { ru } from "./ru";

const dictionaries: Record<AppLocale, TranslationSchema> = { en, ru };

export type TranslateParams = Record<string, string | number>;

function getNested(dict: TranslationSchema, path: string): string | undefined {
  const parts = path.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: AppLocale) {
  const dict = dictionaries[locale] ?? en;

  function t(path: string, params?: TranslateParams): string {
    const template = getNested(dict, path) ?? getNested(en, path) ?? path;
    if (!params) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = params[key];
      return value == null ? "" : String(value);
    });
  }

  return { t, locale };
}

export function useI18n() {
  const locale = useAppSelector((s) => s.settings.locale);
  return useMemo(() => createTranslator(locale), [locale]);
}

export function taskStatusLabel(
  t: ReturnType<typeof createTranslator>["t"],
  status: string,
): string {
  if (status === "in_progress") return t("project.statusInProgress");
  if (status === "done") return t("project.statusDone");
  return t("project.statusTodo");
}

export function memberCountLabel(
  t: ReturnType<typeof createTranslator>["t"],
  count: number,
  context: "project" | "members" = "project",
): string {
  const prefix = context === "members" ? "project.membersCount" : "project.member";
  const key = count === 1 ? `${prefix}One` : `${prefix}Many`;
  return t(key, { count });
}

export function subtaskCountLabel(t: ReturnType<typeof createTranslator>["t"], count: number): string {
  return t(count === 1 ? "project.subtaskOne" : "project.subtaskMany", { count });
}

export function kanbanColumnTitle(t: ReturnType<typeof createTranslator>["t"], status: TaskStatus): string {
  return taskStatusLabel(t, status);
}

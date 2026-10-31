import type { CommandFolder, CommandItem, Language, PieItem, PieMenuSettings, WorkspaceBinding, WorkspaceMenu } from "./types";

export const FOLDER_ID_PATTERN = /^[a-zA-Z]+$/;

function letters(value: number): string {
  let result = "";
  let current = value;
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(97 + current % 26) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

export function nextFolderId(used: ReadonlySet<string>): string {
  if (!used.has("folder")) return "folder";
  let index = 1;
  while (used.has(`folder${letters(index)}`)) index += 1;
  return `folder${letters(index)}`;
}

export const DEFAULT_SETTINGS: PieMenuSettings = {
  language: "ru",
  locale: "en",
  triggerMode: "single",
  doublePressDelay: 350,
  radius: 92,
  sounds: true,
  spaceConnectorEnabled: true,
  workspaceMenus: [],
  bindings: [],
  workspaceIcons: {},
  items: []
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function color(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : undefined;
}

function command(value: unknown): CommandItem | null {
  const source = record(value);
  const commandId = text(source.commandId).trim();
  if (!commandId) return null;
  return {
    type: "command",
    commandId,
    label: text(source.label).trim() || undefined,
    icon: text(source.icon, "command").trim() || "command",
    color: color(source.color)
  };
}

function item(value: unknown, usedIds: Set<string>): PieItem | null {
  const source = record(value);
  if (source.type === "command") return command(source);
  if (source.type !== "folder") return null;
  const id = text(source.id).trim();
  if (!FOLDER_ID_PATTERN.test(id) || usedIds.has(id)) return null;
  usedIds.add(id);
  const folder: CommandFolder = {
    type: "folder",
    id,
    label: text(source.label, id).trim() || id,
    icon: text(source.icon, "folder").trim() || "folder",
    color: color(source.color),
    children: Array.isArray(source.children)
      ? source.children.map(command).filter((entry): entry is CommandItem => entry !== null)
      : []
  };
  return folder;
}

function items(value: unknown): PieItem[] {
  const usedIds = new Set<string>();
  return Array.isArray(value)
    ? value.map((entry) => item(entry, usedIds)).filter((entry): entry is PieItem => entry !== null)
    : [];
}

function workspaceMenus(value: unknown): WorkspaceMenu[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  return value.flatMap((entry) => {
    const source = record(entry);
    const workspaceName = text(source.workspaceName).trim();
    if (!workspaceName || names.has(workspaceName)) return [];
    names.add(workspaceName);
    return [{ workspaceName, items: items(source.items) }];
  });
}

function bindings(value: unknown): WorkspaceBinding[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  return value.flatMap((entry) => {
    const source = record(entry);
    const workspaceName = text(source.workspaceName).trim();
    if (!workspaceName || names.has(workspaceName)) return [];
    names.add(workspaceName);
    const commands = Array.isArray(source.commands)
      ? [...new Set(source.commands.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))]
      : [];
    return [{ workspaceName, commands }];
  });
}

function workspaceIcons(value: unknown): Record<string, string> {
  const source = record(value);
  return Object.fromEntries(Object.entries(source).flatMap(([name, icon]) => {
    const cleanName = name.trim();
    const cleanIcon = text(icon).trim();
    return cleanName && cleanIcon ? [[cleanName, cleanIcon]] : [];
  }));
}

export function normalizeSettings(value: unknown, fallbackLocale: "ru" | "en" = "en"): PieMenuSettings {
  const source = record(value);
  const language: Language = source.language === "ru" || source.language === "en" || source.language === "zh"
    ? source.language
    : source.locale === "ru" ? "ru" : fallbackLocale;
  const delay = typeof source.doublePressDelay === "number" ? source.doublePressDelay : 350;
  const radius = typeof source.radius === "number" ? source.radius : 92;
  return {
    language,
    locale: language === "ru" ? "ru" : "en",
    triggerMode: source.triggerMode === "double" ? "double" : "single",
    doublePressDelay: Math.round(Math.min(700, Math.max(200, delay))),
    radius: Math.round(Math.min(140, Math.max(72, radius))),
    sounds: source.sounds !== false,
    spaceConnectorEnabled: source.spaceConnectorEnabled !== false,
    workspaceMenus: workspaceMenus(source.workspaceMenus),
    bindings: bindings(Array.isArray(source.bindings) ? source.bindings : source.spaces),
    workspaceIcons: workspaceIcons(source.workspaceIcons),
    items: items(source.items)
  };
}


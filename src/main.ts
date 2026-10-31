import { FuzzySuggestModal, getLanguage, Notice, Plugin, setIcon } from "obsidian";
import { CommandRegistry } from "./command-registry";
import { normalizeSettings } from "./core/settings";
import type { PieItem, PieMenuSettings, WorkspaceBinding } from "./core/types";
import { setLocale } from "./i18n";
import { PieMenu } from "./pie-menu";
import { PieMenuSettingTab } from "./settings-tab";
import { WorkspaceConnector } from "./workspace-connector";

const COPY = {
  ru: { openPalette: "Открыть палитру активного Workspace", openPie: "Открыть круговое меню активного Workspace", coreMissing: "Встроенный плагин «Пространства» не включён", noMapping: "Для активного Workspace палитра не настроена", palette: "Выберите команду…", statusMissing: "Workspace: не подключены", statusNone: "Workspace: не выбран", paletteCommands: "Команды палитры", paletteOrder: "Порядок команд", emptyPalette: "Команды пока не выбраны", selected: "Выбрано", cancel: "Отмена", save: "Сохранить", unavailable: "Недоступно", commandsSearch: "Поиск команд…", moveUp: "Выше", moveDown: "Ниже", remove: "Удалить", import: "Импортировать", export: "Экспортировать", transfer: "Импорт и экспорт", transferDesc: "Переносит всю конфигурацию одной строкой JSON.", copied: "Конфигурация скопирована", imported: "Конфигурация импортирована", badImport: "Не удалось импортировать конфигурацию" },
  en: { openPalette: "Open active Workspace palette", openPie: "Open active Workspace radial menu", coreMissing: "The built-in Workspaces plugin is disabled", noMapping: "The active Workspace has no configured palette", palette: "Choose a command…", statusMissing: "Workspaces: disconnected", statusNone: "Workspace: none", paletteCommands: "Palette commands", paletteOrder: "Command order", emptyPalette: "No commands selected yet", selected: "Selected", cancel: "Cancel", save: "Save", unavailable: "Unavailable", commandsSearch: "Search commands…", moveUp: "Move up", moveDown: "Move down", remove: "Remove", import: "Import", export: "Export", transfer: "Import and export", transferDesc: "Transfers the full configuration as one JSON line.", copied: "Configuration copied", imported: "Configuration imported", badImport: "Could not import configuration" },
  zh: { openPalette: "打开当前工作区命令面板", openPie: "打开当前工作区圆形菜单", coreMissing: "内置工作区插件未启用", noMapping: "当前工作区尚未配置命令面板", palette: "选择命令…", statusMissing: "工作区：未连接", statusNone: "工作区：未选择", paletteCommands: "面板命令", paletteOrder: "命令顺序", emptyPalette: "尚未选择命令", selected: "已选择", cancel: "取消", save: "保存", unavailable: "不可用", commandsSearch: "搜索命令…", moveUp: "上移", moveDown: "下移", remove: "删除", import: "导入", export: "导出", transfer: "导入和导出", transferDesc: "以一行 JSON 传输完整配置。", copied: "配置已复制", imported: "配置已导入", badImport: "无法导入配置" },
} as const;

type CopyKey = keyof typeof COPY.en;

interface PaletteItem { id: string; name: string }

class PalettePicker extends FuzzySuggestModal<PaletteItem> {
  constructor(app: SpaceCommandPalettePlugin["app"], private readonly items: PaletteItem[], private readonly run: (id: string) => void, placeholder: string) {
    super(app); this.setPlaceholder(placeholder);
  }
  getItems(): PaletteItem[] { return this.items; }
  getItemText(item: PaletteItem): string { return item.name; }
  onChooseItem(item: PaletteItem): void { this.run(item.id); }
}

export default class SpaceCommandPalettePlugin extends Plugin {
  declare settings: PieMenuSettings;
  registry!: CommandRegistry;
  spaceConnector!: WorkspaceConnector;
  private menu!: PieMenu;
  private statusBar!: HTMLElement;
  private pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private lastPress = 0;
  private lastWorkspaceName: string | null | undefined;

  override async onload(): Promise<void> {
    const fallback = getLanguage().toLowerCase().startsWith("ru") ? "ru" : "en";
    this.settings = normalizeSettings(await this.loadData(), fallback);
    setLocale(this.settings.locale);
    this.registry = new CommandRegistry(this.app);
    this.spaceConnector = new WorkspaceConnector(this.app);
    this.menu = new PieMenu((id) => this.registry.execute(id));
    this.statusBar = this.addStatusBarItem();
    this.statusBar.addClass("space-command-palette-status");
    this.statusBar.addEventListener("click", () => this.openPalette());
    this.addRibbonIcon("list-filter", "Space Command Palette", () => this.openPalette());
    this.registerDomEvent(document, "pointermove", (event: PointerEvent) => { this.pointer = { x: event.clientX, y: event.clientY }; }, { passive: true });
    this.addCommand({ id: "open-palette", name: this.text("openPalette"), callback: () => this.openPalette() });
    this.addCommand({ id: "open-pie-menu", name: this.text("openPie"), callback: () => this.handlePieTrigger() });
    this.addSettingTab(new PieMenuSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => this.syncWorkspace(true));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.syncWorkspace()));
    this.registerInterval(window.setInterval(() => this.syncWorkspace(), 500));
    this.updateStatus();
  }

  override onunload(): void { this.menu.destroy(); }

  text(key: CopyKey): string { return COPY[this.settings.language]?.[key] ?? COPY.en[key]; }

  async saveSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings, this.settings.locale);
    setLocale(this.settings.locale);
    await this.saveData(this.settings);
    this.updateStatus();
  }

  getMenuItems(workspaceName: string | null): PieItem[] {
    if (!workspaceName) return this.settings.items;
    return this.settings.workspaceMenus.find((menu) => menu.workspaceName === workspaceName)?.items ?? this.settings.items;
  }

  async ensureWorkspaceMenus(names: string[]): Promise<void> {
    let changed = false;
    for (const workspaceName of names) {
      if (!this.settings.workspaceMenus.some((menu) => menu.workspaceName === workspaceName)) {
        const items = normalizeSettings({ items: this.settings.items }, this.settings.locale).items;
        this.settings.workspaceMenus.push({ workspaceName, items }); changed = true;
      }
      if (!this.settings.bindings.some((binding) => binding.workspaceName === workspaceName)) {
        this.settings.bindings.push({ workspaceName, commands: [] }); changed = true;
      }
    }
    if (changed) await this.saveSettings();
  }

  getBinding(workspaceName: string): WorkspaceBinding {
    let binding = this.settings.bindings.find((entry) => entry.workspaceName === workspaceName);
    if (!binding) { binding = { workspaceName, commands: [] }; this.settings.bindings.push(binding); }
    return binding;
  }

  openPalette(): void {
    if (!this.spaceConnector.isAvailable()) { new Notice(this.text("coreMissing")); return; }
    const workspaceName = this.spaceConnector.getActiveWorkspaceName();
    const binding = workspaceName ? this.settings.bindings.find((entry) => entry.workspaceName === workspaceName) : null;
    if (!binding?.commands.length) { new Notice(this.text("noMapping")); this.registry.execute("command-palette:open"); return; }
    const names = new Map(this.registry.list().map((command) => [command.id, command.name]));
    const items = binding.commands.flatMap((id) => names.has(id) ? [{ id, name: names.get(id)! }] : []);
    if (!items.length) { new Notice(this.text("noMapping")); return; }
    new PalettePicker(this.app, items, (id) => { this.registry.execute(id); }, `${binding.workspaceName}: ${this.text("palette")}`).open();
  }

  exportString(): string { return JSON.stringify({ version: 2, ...this.settings }); }

  async importString(raw: string): Promise<void> {
    const parsed: unknown = JSON.parse(raw);
    this.settings = normalizeSettings(parsed, this.settings.locale);
    await this.saveSettings();
  }

  private handlePieTrigger(): void {
    if (this.settings.triggerMode === "double") {
      const now = Date.now();
      if (now - this.lastPress > this.settings.doublePressDelay) { this.lastPress = now; return; }
      this.lastPress = 0;
    }
    const workspaceName = this.spaceConnector.getActiveWorkspaceName();
    const items = this.getMenuItems(workspaceName);
    this.menu.setContext(items, new Map(this.registry.list().map((command) => [command.id, command.name])));
    this.menu.open(items, this.pointer, this.settings.radius, this.settings.sounds);
  }

  private syncWorkspace(force = false): void {
    const name = this.spaceConnector.getActiveWorkspaceName();
    if (!force && name === this.lastWorkspaceName) return;
    this.lastWorkspaceName = name; this.updateStatus();
  }

  private updateStatus(): void {
    if (!this.statusBar) return;
    if (!this.spaceConnector?.isAvailable()) { this.statusBar.setText(this.text("statusMissing")); return; }
    const name = this.spaceConnector.getActiveWorkspaceName();
    if (!name) { this.statusBar.setText(this.text("statusNone")); return; }
    this.statusBar.empty();
    const icon = this.statusBar.createSpan({ cls: "space-command-palette-status-icon" });
    setIcon(icon, this.settings.workspaceIcons[name] ?? "panel-top");
    this.statusBar.createSpan({ cls: "space-command-palette-status-name", text: name });
  }
}

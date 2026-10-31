import { App, Menu, Modal, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type SpaceCommandPalettePlugin from "./main";
import type { CommandFolder, CommandItem, PieItem } from "./core/types";
import { FOLDER_ID_PATTERN, nextFolderId } from "./core/settings";
import { annularSectorPolygon, radialSlotCount, sectorPolygon } from "./core/geometry";
import { t } from "./i18n";
import { CommandPicker, IconPicker } from "./pickers";
import { CommandOrderModal, CommandPickerModal, ImportConfigModal } from "./palette-modals";

type ItemOwner = PieItem[] | CommandItem[];
type SettingsSection = "general" | "palettes" | "radial";

class WorkspaceNameModal extends Modal {
  constructor(app: App, private readonly value: string, private readonly submit: (value: string) => void) { super(app); }
  onOpen(): void {
    this.setTitle(t("renameWorkspaceTitle"));
    const input = this.contentEl.createEl("input", { attr: { type: "text", value: this.value, "aria-label": t("workspaceName") } });
    input.addClass("oxpm-workspace-name-input");
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    actions.createEl("button", { text: t("cancel") }).addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: t("renameWorkspace"), cls: "mod-cta" });
    const finish = () => { const value = input.value.trim(); if (value) { this.close(); this.submit(value); } };
    save.addEventListener("click", finish);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") finish(); });
    window.setTimeout(() => { input.focus(); input.select(); });
  }
}

class DeleteWorkspaceModal extends Modal {
  constructor(app: App, private readonly name: string, private readonly confirm: () => void) { super(app); }
  onOpen(): void {
    this.setTitle(t("deleteWorkspaceTitle"));
    this.contentEl.createEl("p", { text: t("deleteWorkspaceDesc") });
    this.contentEl.createEl("strong", { text: this.name });
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    actions.createEl("button", { text: t("cancel") }).addEventListener("click", () => this.close());
    actions.createEl("button", { text: t("confirmDelete"), cls: "mod-warning" }).addEventListener("click", () => { this.close(); this.confirm(); });
  }
}

export class PieMenuSettingTab extends PluginSettingTab {
  private dragged: { owner: ItemOwner; index: number } | null = null;
  private selectedItem: PieItem | null = null;
  private selectedFolder: CommandFolder | null = null;
  private selectedWorkspace: string | null = null;
  private selectedSection: SettingsSection = "radial";
  private settingsContentEl: HTMLElement | null = null;
  private workspaceHostEl: HTMLElement | null = null;
  private navigationButtons = new Map<SettingsSection, HTMLButtonElement>();
  private itemElements = new WeakMap<PieItem, HTMLElement>();
  private previewElements = new WeakMap<PieItem, HTMLElement>();

  constructor(app: App, private readonly plugin: SpaceCommandPalettePlugin) { super(app, plugin); }

  display(): void {
    this.containerEl.empty();
    this.containerEl.addClass("oxpm-settings");
    this.itemElements = new WeakMap();
    this.previewElements = new WeakMap();
    this.navigationButtons.clear();
    if (!this.plugin.spaceConnector.isAvailable()) this.selectedWorkspace = null;
    else if (this.selectedWorkspace === null) this.selectedWorkspace = this.plugin.spaceConnector.getActiveWorkspaceName();
    const currentItems = this.currentItems();
    if (this.selectedFolder && !currentItems.includes(this.selectedFolder)) this.selectedFolder = null;
    const shell = this.containerEl.createDiv({ cls: "oxpm-settings-shell" });
    const sidebar = shell.createDiv({ cls: "oxpm-settings-sidebar" });
    this.renderSettingsNavigation(sidebar.createEl("nav", { cls: "oxpm-settings-nav", attr: { "aria-label": t("generalTitle") } }));
    this.workspaceHostEl = sidebar.createDiv({ cls: "oxpm-workspace-host" });
    this.settingsContentEl = shell.createDiv({ cls: "oxpm-settings-content" });
    this.renderActiveSection();
  }

  private renderActiveSection(): void {
    const content = this.settingsContentEl;
    const workspaceHost = this.workspaceHostEl;
    if (!content || !workspaceHost) return;
    content.empty(); workspaceHost.empty();
    this.itemElements = new WeakMap(); this.previewElements = new WeakMap();
    this.navigationButtons.forEach((button, id) => button.toggleClass("is-active", id === this.selectedSection));
    this.renderWorkspaceSidebar(workspaceHost);
    if (this.selectedSection === "general") this.renderGeneralSection(content);
    else if (this.selectedSection === "palettes") this.renderPalettesSection(content);
    else this.renderRadialSection(content);
  }

  private renderSettingsNavigation(parent: HTMLElement): void {
    const sections: Array<{ id: SettingsSection; label: string; icon: string }> = [
      { id: "general", label: t("settingsSectionGeneral"), icon: "settings-2" },
      { id: "palettes", label: t("settingsSectionPalettes"), icon: "list-filter" },
      { id: "radial", label: t("settingsSectionRadial"), icon: "circle-dot" },
    ];
    sections.forEach(({ id, label, icon }) => {
      const button = parent.createEl("button", { cls: `oxpm-settings-nav-item${this.selectedSection === id ? " is-active" : ""}`, attr: { type: "button" } });
      this.navigationButtons.set(id, button);
      const iconEl = button.createSpan({ cls: "oxpm-settings-nav-icon" }); setIcon(iconEl, icon);
      button.createSpan({ text: label });
      button.addEventListener("click", () => { this.selectedSection = id; this.selectedFolder = null; this.selectedItem = null; this.renderActiveSection(); });
    });
  }

  private renderGeneralSection(parent: HTMLElement): void {
    new Setting(parent).setName(t("settingsSectionGeneral")).setHeading();
    const general = parent.createDiv({ cls: "oxpm-settings-group" });
    this.renderGeneral(general);
  }

  private renderPalettesSection(parent: HTMLElement): void {
    new Setting(parent).setName(t("paletteTitle")).setDesc(t("paletteDesc")).setHeading();
    const editor = parent.createDiv({ cls: "oxpm-palette-editor oxpm-settings-group" });
    if (!this.plugin.spaceConnector.isAvailable()) {
      editor.createDiv({ cls: "oxpm-editor-empty", text: t("spaceConnectorMissing") }); return;
    }
    if (!this.selectedWorkspace) {
      editor.createDiv({ cls: "oxpm-editor-empty", text: t("workspaceMenuDesc") }); return;
    }
    const binding = this.plugin.getBinding(this.selectedWorkspace);
    const summary = editor.createDiv({ cls: "oxpm-palette-summary" });
    summary.createDiv({ cls: "oxpm-palette-name", text: this.selectedWorkspace });
    summary.createDiv({ cls: "oxpm-palette-count", text: `${binding.commands.length} ${t("commandsCount")}` });
    const actions = summary.createDiv({ cls: "oxpm-palette-actions" });
    actions.createEl("button", { text: t("addCommand"), cls: "mod-cta" }).addEventListener("click", () => new CommandPickerModal(this.app, this.plugin, binding, () => this.renderActiveSection()).open());
    actions.createEl("button", { text: this.plugin.text("paletteOrder") }).addEventListener("click", () => new CommandOrderModal(this.app, this.plugin, binding, () => this.renderActiveSection()).open());
    const list = editor.createDiv({ cls: "oxpm-palette-command-list" });
    if (!binding.commands.length) list.createDiv({ cls: "oxpm-editor-empty", text: this.plugin.text("emptyPalette") });
    binding.commands.forEach((id) => {
      const command = this.plugin.registry.list().find((entry) => entry.id === id);
      const row = list.createDiv({ cls: "oxpm-palette-command" });
      const icon = row.createSpan({ cls: "oxpm-palette-command-icon" }); setIcon(icon, command?.icon || "command");
      const copy = row.createDiv();
      copy.createDiv({ cls: "oxpm-item-title", text: command?.name ?? this.plugin.text("unavailable") });
      copy.createDiv({ cls: "oxpm-item-id", text: id });
    });
  }

  private renderRadialSection(parent: HTMLElement): void {
    new Setting(parent).setName(t("editorTitle")).setDesc(t("editorDesc")).setHeading();
    const radial = parent.createDiv({ cls: "oxpm-radial-workspace" });
    this.renderPreview(radial);
    const editorColumn = radial.createDiv({ cls: "oxpm-editor-column" });
    if (this.selectedFolder) this.renderFolderEditor(editorColumn, this.selectedFolder);
    else this.renderRootEditor(editorColumn);
  }

  private renderWorkspaceSidebar(parent: HTMLElement): void {
    const sidebar = parent.createDiv({ cls: "oxpm-workspace-sidebar" });
    sidebar.createDiv({ cls: "oxpm-workspace-sidebar-title", text: t("workspacesTitle") });
    const activeName = this.plugin.spaceConnector.getActiveWorkspaceName();
    const availableNames = this.plugin.spaceConnector.getWorkspaceNames();
    const configuredNames = [...this.plugin.settings.workspaceMenus.map((menu) => menu.workspaceName), ...this.plugin.settings.bindings.map((binding) => binding.workspaceName)];
    const allNames = [...new Set([...availableNames, ...configuredNames])];
    this.workspaceButton(sidebar, null, t("defaultMenu"), t("globalWorkspaceHint"), "globe-2", false);
    allNames.forEach((name) => {
      const missing = !availableNames.includes(name);
      const detail = missing ? t("missingWorkspace") : name === activeName ? t("activeWorkspace") : "";
      this.workspaceButton(sidebar, name, name, detail, missing ? "circle-alert" : "panel-top", missing);
    });
  }

  private workspaceButton(parent: HTMLElement, value: string | null, label: string, detail: string, icon: string, missing: boolean): void {
    const button = parent.createEl("button", { cls: `oxpm-workspace-item${this.selectedWorkspace === value ? " is-active" : ""}${missing ? " is-missing" : ""}`, attr: { type: "button" } });
    const iconEl = button.createSpan({ cls: "oxpm-workspace-icon" }); setIcon(iconEl, this.plugin.settings.workspaceIcons[value ?? "__global__"] ?? icon);
    const copy = button.createSpan({ cls: "oxpm-workspace-copy" });
    copy.createSpan({ cls: "oxpm-workspace-name", text: label });
    if (detail) copy.createSpan({ cls: "oxpm-workspace-detail", text: detail });
    button.addEventListener("click", async () => {
      this.selectedWorkspace = value;
      if (value) await this.plugin.ensureWorkspaceMenus([value]);
      this.selectedFolder = null; this.selectedItem = null; this.renderActiveSection();
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault(); this.openWorkspaceMenu(event, value, button, icon);
    });
  }

  private openWorkspaceMenu(event: MouseEvent, workspaceName: string | null, anchor: HTMLElement, fallbackIcon: string): void {
    const menu = new Menu();
    menu.addItem((item) => item.setTitle(t("changeIcon")).setIcon("image").onClick(() => {
      const key = workspaceName ?? "__global__";
      new IconPicker(anchor, this.plugin.settings.workspaceIcons[key] ?? fallbackIcon, async (icon) => {
        this.plugin.settings.workspaceIcons[key] = icon;
        await this.plugin.saveSettings(); this.renderActiveSection();
      }).open();
    }));
    if (workspaceName) {
      menu.addItem((item) => item.setTitle(t("renameWorkspace")).setIcon("pencil").onClick(() => {
        new WorkspaceNameModal(this.app, workspaceName, (nextName) => void this.renameWorkspace(workspaceName, nextName)).open();
      }));
      menu.addSeparator();
      menu.addItem((item) => item.setTitle(t("deleteWorkspace")).setIcon("trash-2").setWarning(true).onClick(() => {
        new DeleteWorkspaceModal(this.app, workspaceName, () => void this.deleteWorkspace(workspaceName)).open();
      }));
    }
    menu.showAtMouseEvent(event);
  }

  private async renameWorkspace(currentName: string, nextName: string): Promise<void> {
    if (nextName === currentName) return;
    if (this.plugin.spaceConnector.getWorkspaceNames().includes(nextName)) { new Notice(t("workspaceExists")); return; }
    if (!await this.plugin.spaceConnector.renameWorkspace(currentName, nextName)) { new Notice(t("workspaceActionFailed")); return; }
    this.plugin.settings.workspaceMenus.forEach((menu) => { if (menu.workspaceName === currentName) menu.workspaceName = nextName; });
    this.plugin.settings.bindings.forEach((binding) => { if (binding.workspaceName === currentName) binding.workspaceName = nextName; });
    const icon = this.plugin.settings.workspaceIcons[currentName];
    if (icon) this.plugin.settings.workspaceIcons[nextName] = icon;
    delete this.plugin.settings.workspaceIcons[currentName];
    if (this.selectedWorkspace === currentName) this.selectedWorkspace = nextName;
    await this.plugin.saveSettings(); this.renderActiveSection();
  }

  private async deleteWorkspace(workspaceName: string): Promise<void> {
    if (!await this.plugin.spaceConnector.deleteWorkspace(workspaceName)) { new Notice(t("workspaceActionFailed")); return; }
    this.plugin.settings.workspaceMenus = this.plugin.settings.workspaceMenus.filter((menu) => menu.workspaceName !== workspaceName);
    this.plugin.settings.bindings = this.plugin.settings.bindings.filter((binding) => binding.workspaceName !== workspaceName);
    delete this.plugin.settings.workspaceIcons[workspaceName];
    if (this.selectedWorkspace === workspaceName) this.selectedWorkspace = null;
    this.selectedFolder = null; this.selectedItem = null;
    await this.plugin.saveSettings(); this.renderActiveSection();
  }

  private renderGeneral(parent: HTMLElement): void {
    const hotkey = parent.createDiv({ cls: "oxpm-hotkey-note" });
    const hotkeyIcon = hotkey.createSpan({ cls: "oxpm-hotkey-icon" }); setIcon(hotkeyIcon, "keyboard");
    const hotkeyCopy = hotkey.createDiv();
    hotkeyCopy.createDiv({ cls: "oxpm-hotkey-title", text: t("settingsHotkey") });
    hotkeyCopy.createDiv({ cls: "oxpm-hotkey-desc", text: t("settingsHotkeyDesc") });
    new Setting(parent).setName(t("settingsLanguage")).addDropdown((dropdown) => dropdown
      .addOption("ru", "Русский").addOption("en", "English").addOption("zh", "中文").setValue(this.plugin.settings.language)
      .onChange(async (value) => {
        this.plugin.settings.language = value === "ru" || value === "zh" ? value : "en";
        this.plugin.settings.locale = value === "ru" ? "ru" : "en";
        await this.plugin.saveSettings(); this.display();
      }));
    new Setting(parent).setName(t("settingsTrigger")).addDropdown((dropdown) => dropdown
      .addOption("single", t("settingsSingle")).addOption("double", t("settingsDouble"))
      .setValue(this.plugin.settings.triggerMode).onChange(async (value) => {
        this.plugin.settings.triggerMode = value === "double" ? "double" : "single"; await this.plugin.saveSettings(); this.display();
      }));
    if (this.plugin.settings.triggerMode === "double") new Setting(parent).setName(t("settingsDelay")).setDesc(t("settingsDelayDesc")).addSlider((slider) => slider
      .setLimits(200, 700, 25).setDynamicTooltip().setValue(this.plugin.settings.doublePressDelay)
      .onChange(async (value) => { this.plugin.settings.doublePressDelay = value; await this.plugin.saveSettings(); }));
    new Setting(parent).setName(t("settingsRadius")).setDesc(t("settingsRadiusDesc")).addSlider((slider) => slider
      .setLimits(72, 140, 4).setDynamicTooltip().setValue(this.plugin.settings.radius)
      .onChange(async (value) => { this.plugin.settings.radius = value; await this.plugin.saveSettings(); }));
    new Setting(parent).setName(t("settingsSounds")).setDesc(t("settingsSoundsDesc")).addToggle((toggle) => toggle
      .setValue(this.plugin.settings.sounds)
      .onChange(async (value) => { this.plugin.settings.sounds = value; await this.plugin.saveSettings(); }));
    new Setting(parent).setName(this.plugin.text("import")).setDesc(this.plugin.text("transferDesc"))
      .addButton((button) => button.setButtonText(this.plugin.text("import")).onClick(() => new ImportConfigModal(this.app, this.plugin, () => this.display()).open()));
    new Setting(parent).setName(this.plugin.text("export")).setDesc(this.plugin.text("transferDesc"))
      .addButton((button) => button.setButtonText(this.plugin.text("export")).onClick(async () => {
        try { await navigator.clipboard.writeText(this.plugin.exportString()); new Notice(this.plugin.text("copied")); }
        catch { new Notice(this.plugin.text("badImport")); }
      }));
  }

  private currentItems(): PieItem[] { return this.plugin.getMenuItems(this.selectedWorkspace); }

  private renderRootEditor(parent: HTMLElement): void {
    const list = parent.createDiv({ cls: "oxpm-editor" });
    const items = this.currentItems();
    if (items.length === 0) list.createDiv({ cls: "oxpm-editor-empty", text: t("emptyHint") });
    items.forEach((item, index) => item.type === "folder" ? this.renderFolderRow(list, item, index) : this.renderCommandRow(list, items, item, index));
    const actions = parent.createDiv({ cls: "oxpm-editor-actions" });
    actions.createEl("button", { text: t("addCommand"), cls: "mod-cta" }).addEventListener("click", () => this.addCommand(items));
    actions.createEl("button", { text: t("addFolder") }).addEventListener("click", () => this.addFolder());
  }

  private renderFolderEditor(parent: HTMLElement, folder: CommandFolder): void {
    const header = parent.createDiv({ cls: "oxpm-folder-header" });
    const back = header.createEl("button", { cls: "oxpm-folder-back", attr: { type: "button", "aria-label": t("back"), title: t("back") } });
    setIcon(back, "arrow-left");
    back.addEventListener("click", () => { this.selectedFolder = null; this.selectedItem = folder; this.renderActiveSection(); });
    const iconButton = header.createEl("button", { cls: "oxpm-icon-button", attr: { type: "button", "aria-label": t("changeIcon") } });
    setIcon(iconButton, folder.icon);
    iconButton.addEventListener("click", () => new IconPicker(iconButton, folder.icon, async (icon) => { folder.icon = icon; await this.persist(); }).open());
    const copy = header.createDiv({ cls: "oxpm-folder-header-copy" });
    copy.createDiv({ cls: "oxpm-folder-eyebrow", text: t("folder") });
    copy.createDiv({ cls: "oxpm-folder-header-title", text: folder.label });
    copy.createDiv({ cls: "oxpm-folder-header-count", text: `${folder.children.length} ${t("commandsCount")}` });
    const add = header.createEl("button", { cls: "oxpm-folder-add", attr: { type: "button", "aria-label": t("addToFolder"), title: t("addToFolder") } });
    setIcon(add, "plus");
    add.addEventListener("click", () => this.addCommand(folder.children));
    const fields = parent.createDiv({ cls: "oxpm-folder-editor-fields" });
    this.addLabeledInput(fields, t("folderName"), folder.label, async (value) => { folder.label = value || folder.id; await this.persist(); });
    this.addLabeledInput(fields, t("folderId"), folder.id, async (value, input) => {
      const duplicate = this.currentItems().some((item) => item.type === "folder" && item !== folder && item.id === value);
      if (!FOLDER_ID_PATTERN.test(value) || duplicate) { input.value = folder.id; new Notice(t("folderInvalid")); return; }
      folder.id = value; await this.persist();
    });
    const listHeader = parent.createDiv({ cls: "oxpm-folder-list-header" });
    listHeader.createDiv({ cls: "oxpm-folder-list-title", text: t("folderCommands") });
    const list = parent.createDiv({ cls: "oxpm-editor oxpm-folder-command-list" });
    if (folder.children.length === 0) list.createDiv({ cls: "oxpm-editor-empty", text: t("folderEmpty") });
    folder.children.forEach((item, index) => this.renderCommandRow(list, folder.children, item, index));
  }

  private addLabeledInput(parent: HTMLElement, label: string, value: string, save: (value: string, input: HTMLInputElement) => void | Promise<void>): void {
    const field = parent.createDiv({ cls: "oxpm-folder-field" });
    field.createEl("label", { text: label });
    const input = field.createEl("input", { attr: { type: "text", value } });
    input.addEventListener("change", () => void save(input.value.trim(), input));
  }

  private renderFolderRow(parent: HTMLElement, folder: CommandFolder, index: number): void {
    const items = this.currentItems();
    const card = this.createCard(parent, items, folder, index, "folder");
    const body = card.createDiv({ cls: "oxpm-item-body oxpm-folder-summary" });
    body.createDiv({ cls: "oxpm-item-title", text: folder.label });
    body.createDiv({ cls: "oxpm-item-id", text: `${folder.id} · ${folder.children.length} ${t("commandsCount")}` });
    body.addEventListener("click", () => this.openFolder(folder));
    const open = card.createEl("button", { cls: "oxpm-folder-open", attr: { type: "button", "aria-label": t("openFolder"), title: t("openFolder") } });
    setIcon(open, "chevron-right"); open.addEventListener("click", () => this.openFolder(folder));
    this.renderControls(card, items, folder, index);
  }

  private renderCommandRow(parent: HTMLElement, owner: ItemOwner, item: CommandItem, index: number): void {
    const card = this.createCard(parent, owner, item, index, "command");
    const body = card.createDiv({ cls: "oxpm-item-body" });
    const command = this.plugin.registry.list().find((entry) => entry.id === item.commandId);
    body.createDiv({ cls: "oxpm-item-title", text: item.label || command?.name || t("commandMissing") });
    body.createDiv({ cls: "oxpm-item-id", text: item.commandId });
    this.renderControls(card, owner, item, index);
  }

  private createCard(parent: HTMLElement, owner: ItemOwner, item: PieItem, index: number, type: "folder" | "command"): HTMLElement {
    const card = parent.createDiv({ cls: `oxpm-item is-${type}`, attr: { draggable: "true", tabindex: "-1" } });
    if (item === this.selectedItem) card.addClass("is-selected");
    this.itemElements.set(item, card);
    card.addEventListener("dragstart", () => { this.dragged = { owner, index }; card.addClass("is-dragging"); });
    card.addEventListener("dragend", () => { this.dragged = null; card.removeClass("is-dragging"); });
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      if (!this.dragged || this.dragged.owner !== owner) return;
      const from = this.dragged.index;
      if (from === index || from < 0 || from >= owner.length) return;
      const moved = owner.splice(from, 1)[0]; if (!moved) return;
      owner.splice(index, 0, moved); await this.persist();
    });
    const handle = card.createSpan({ cls: "oxpm-drag" }); setIcon(handle, "grip-vertical");
    const iconButton = card.createEl("button", { cls: "oxpm-icon-button", attr: { type: "button", "aria-label": t("changeIcon") } });
    setIcon(iconButton, item.icon);
    iconButton.addEventListener("click", () => new IconPicker(iconButton, item.icon, async (icon) => { item.icon = icon; await this.persist(); }).open());
    return card;
  }

  private renderControls(card: HTMLElement, owner: ItemOwner, item: PieItem, index: number): void {
    const controls = card.createDiv({ cls: "oxpm-item-controls" });
    const color = controls.createEl("input", { cls: "oxpm-color", attr: { type: "color", value: item.color ?? "#7c6ee6", "aria-label": t("color"), title: t("color") } });
    color.addEventListener("change", async () => { item.color = color.value; await this.persist(); });
    this.iconControl(controls, "rotate-ccw", t("accentColor"), async () => { delete item.color; await this.persist(); });
    this.iconControl(controls, "arrow-up", t("moveUp"), () => this.move(owner, index, -1));
    this.iconControl(controls, "arrow-down", t("moveDown"), () => this.move(owner, index, 1));
    this.iconControl(controls, "trash", t("remove"), async () => {
      owner.splice(index, 1);
      if (item === this.selectedFolder) this.selectedFolder = null;
      if (item === this.selectedItem) this.selectedItem = null;
      await this.persist();
    });
  }

  private renderPreview(parent: HTMLElement): void {
    const panel = parent.createDiv({ cls: "oxpm-preview-panel" });
    panel.createDiv({ cls: "oxpm-preview-title", text: t("preview") });
    const canvas = panel.createDiv({ cls: "oxpm-preview" });
    const items = this.currentItems();
    if (items.length === 0) { canvas.createDiv({ cls: "oxpm-preview-empty", text: t("empty") }); return; }
    const rootOuter = 58;
    const rootInner = 32;
    const slotCount = radialSlotCount(items.length);
    items.forEach((item, index) => {
      const angle = -Math.PI / 2 + ((index + 0.5) * Math.PI * 2) / slotCount;
      const sector = this.createPreviewSector(canvas, item, rootOuter, sectorPolygon(index, slotCount, rootOuter, rootInner), angle, (rootInner + rootOuter) / 2, index, false);
      sector.addEventListener("click", () => item.type === "folder" ? this.openFolder(item) : this.selectItem(item));
    });
    if (this.selectedFolder) this.renderPreviewSubmenu(canvas, items, slotCount, this.selectedFolder);
    const center = canvas.createDiv({ cls: "oxpm-preview-center" });
    center.setCssStyles({ left: "76px", top: "76px" });
    setIcon(center, "x");
  }

  private renderPreviewSubmenu(canvas: HTMLElement, items: PieItem[], slotCount: number, folder: CommandFolder): void {
    const folderIndex = items.indexOf(folder);
    const count = folder.children.length;
    if (folderIndex < 0 || count === 0) return;
    const folderAngle = -Math.PI / 2 + ((folderIndex + 0.5) * Math.PI * 2) / slotCount;
    const fanSpan = Math.min(Math.PI * 0.92, Math.max(0.7, count * 0.48));
    const segment = fanSpan / count;
    const start = folderAngle - fanSpan / 2;
    folder.children.forEach((item, index) => {
      const sectorStart = start + index * segment;
      const sectorEnd = sectorStart + segment;
      const angle = (sectorStart + sectorEnd) / 2;
      const sector = this.createPreviewSector(canvas, item, 90, annularSectorPolygon(sectorStart, sectorEnd, 90, 62), angle, 76, index, true);
      sector.addEventListener("click", () => this.selectItem(item));
    });
  }

  private createPreviewSector(
    canvas: HTMLElement,
    item: PieItem,
    radius: number,
    clipPath: string,
    angle: number,
    iconRadius: number,
    animationIndex: number,
    submenu: boolean,
  ): HTMLButtonElement {
    const label = item.type === "folder" ? item.label : this.plugin.registry.list().find((command) => command.id === item.commandId)?.name ?? item.label ?? item.commandId;
    const sector = canvas.createEl("button", {
      cls: `oxpm-preview-sector${submenu ? " is-submenu" : ""}${item === this.selectedItem || item === this.selectedFolder ? " is-selected" : ""}`,
      attr: { type: "button", "aria-label": label, title: label }
    });
    sector.setCssStyles({ left: `${98 - radius}px`, top: `${98 - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px`, clipPath });
    sector.style.setProperty("--oxpm-preview-color", item.color ?? "var(--interactive-accent)");
    sector.style.setProperty("--oxpm-preview-index", String(animationIndex));
    const icon = sector.createSpan({ cls: "oxpm-preview-icon" });
    icon.setCssStyles({ left: `${radius + Math.cos(angle) * iconRadius}px`, top: `${radius + Math.sin(angle) * iconRadius}px` });
    setIcon(icon, item.icon);
    this.previewElements.set(item, sector);
    return sector;
  }

  private openFolder(folder: CommandFolder): void { this.selectedFolder = folder; this.selectedItem = folder; this.renderActiveSection(); }

  private addCommand(owner: ItemOwner): void {
    new CommandPicker(this.app, this.plugin.registry.list(), async (command) => {
      const item: CommandItem = { type: "command", commandId: command.id, label: command.name, icon: command.icon || "command" };
      owner.push(item); this.selectedItem = item; await this.persist();
    }).open();
  }

  private async addFolder(): Promise<void> {
    const items = this.currentItems();
    const used = new Set(items.filter((item): item is CommandFolder => item.type === "folder").map((item) => item.id));
    const id = nextFolderId(used);
    const folder: CommandFolder = { type: "folder", id, label: id, icon: "folder", children: [] };
    items.push(folder); this.selectedFolder = folder; this.selectedItem = folder; await this.persist();
  }

  private async move(owner: ItemOwner, index: number, offset: number): Promise<void> {
    const target = index + offset; if (target < 0 || target >= owner.length) return;
    const moved = owner.splice(index, 1)[0]; if (!moved) return;
    owner.splice(target, 0, moved); await this.persist();
  }

  private iconControl(parent: HTMLElement, icon: string, label: string, action: () => void | Promise<void>): void {
    const button = parent.createEl("button", { attr: { type: "button", "aria-label": label, title: label } }); setIcon(button, icon);
    button.addEventListener("click", () => void action());
  }

  private selectItem(item: PieItem): void {
    this.containerEl.querySelectorAll(".oxpm-item.is-selected, .oxpm-preview-sector.is-selected").forEach((element) => element.removeClass("is-selected"));
    this.selectedItem = item;
    const card = this.itemElements.get(item);
    const sector = this.previewElements.get(item);
    card?.addClass("is-selected"); sector?.addClass("is-selected");
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" }); card?.focus({ preventScroll: true });
  }

  private async persist(): Promise<void> {
    const folderId = this.selectedFolder?.id;
    const selectedWasFolder = this.selectedItem === this.selectedFolder;
    const selectedCommandId = this.selectedItem?.type === "command" ? this.selectedItem.commandId : null;
    const selectedWasChild = this.selectedFolder?.children.includes(this.selectedItem as CommandItem) ?? false;
    await this.plugin.saveSettings();
    const items = this.currentItems();
    this.selectedFolder = folderId
      ? items.find((item): item is CommandFolder => item.type === "folder" && item.id === folderId) ?? null
      : null;
    if (selectedWasFolder) this.selectedItem = this.selectedFolder;
    else if (selectedCommandId) {
      const candidates = selectedWasChild
        ? this.selectedFolder?.children ?? []
        : items.filter((item): item is CommandItem => item.type === "command");
      this.selectedItem = candidates.find((item) => item.commandId === selectedCommandId) ?? null;
    }
    this.renderActiveSection();
  }
}

import { Modal, Notice, Setting } from "obsidian";
import type SpaceCommandPalettePlugin from "./main";
import type { WorkspaceBinding } from "./core/types";

export class CommandPickerModal extends Modal {
  private selected: Set<string>;
  private query = "";
  private listEl!: HTMLElement;
  private counterEl!: HTMLElement;

  constructor(
    app: SpaceCommandPalettePlugin["app"],
    private readonly plugin: SpaceCommandPalettePlugin,
    private readonly binding: WorkspaceBinding,
    private readonly onSaved: () => void,
  ) { super(app); this.selected = new Set(binding.commands); }

  override onOpen(): void {
    this.setTitle(this.plugin.text("paletteCommands"));
    this.contentEl.addClass("space-command-picker");
    const search = this.contentEl.createEl("input", { type: "search", placeholder: this.plugin.text("commandsSearch"), cls: "space-command-search" });
    this.counterEl = this.contentEl.createDiv({ cls: "space-command-counter" });
    this.listEl = this.contentEl.createDiv({ cls: "space-command-list" });
    search.addEventListener("input", () => { this.query = search.value.trim().toLocaleLowerCase(); this.renderList(); });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: this.plugin.text("cancel") }).addEventListener("click", () => this.close());
    buttons.createEl("button", { text: this.plugin.text("save"), cls: "mod-cta" }).addEventListener("click", async () => {
      const allIds = new Set(this.plugin.registry.list().map((command) => command.id));
      const ordered = this.binding.commands.filter((id) => this.selected.has(id) && allIds.has(id));
      const added = [...this.selected].filter((id) => !ordered.includes(id) && allIds.has(id));
      this.binding.commands = [...ordered, ...added];
      await this.plugin.saveSettings(); this.onSaved(); this.close();
    });
    this.renderList(); search.focus();
  }

  private renderList(): void {
    this.listEl.empty();
    const commands = this.plugin.registry.list().filter((command) => !this.query || `${command.name} ${command.id}`.toLocaleLowerCase().includes(this.query));
    this.counterEl.setText(`${this.plugin.text("selected")}: ${this.selected.size}`);
    for (const command of commands) {
      const label = this.listEl.createEl("label", { cls: "space-command-option" });
      const checkbox = label.createEl("input", { type: "checkbox" }); checkbox.checked = this.selected.has(command.id);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? this.selected.add(command.id) : this.selected.delete(command.id);
        this.counterEl.setText(`${this.plugin.text("selected")}: ${this.selected.size}`);
      });
      const copy = label.createDiv();
      copy.createDiv({ text: command.name, cls: "space-command-name" });
      copy.createDiv({ text: command.id, cls: "space-command-id" });
    }
  }

  override onClose(): void { this.contentEl.empty(); }
}

export class CommandOrderModal extends Modal {
  constructor(
    app: SpaceCommandPalettePlugin["app"],
    private readonly plugin: SpaceCommandPalettePlugin,
    private readonly binding: WorkspaceBinding,
    private readonly onSaved: () => void,
  ) { super(app); }

  override onOpen(): void { this.setTitle(this.plugin.text("paletteOrder")); this.render(); }

  private render(): void {
    this.contentEl.empty();
    if (!this.binding.commands.length) this.contentEl.createDiv({ text: this.plugin.text("emptyPalette"), cls: "setting-item-description" });
    this.binding.commands.forEach((id, index) => {
      const command = this.plugin.registry.list().find((entry) => entry.id === id);
      const row = new Setting(this.contentEl).setName(command?.name ?? `${this.plugin.text("unavailable")}: ${id}`).setDesc(id);
      row.addExtraButton((button) => button.setIcon("arrow-up").setTooltip(this.plugin.text("moveUp")).setDisabled(index === 0).onClick(() => this.move(index, -1)));
      row.addExtraButton((button) => button.setIcon("arrow-down").setTooltip(this.plugin.text("moveDown")).setDisabled(index === this.binding.commands.length - 1).onClick(() => this.move(index, 1)));
      row.addExtraButton((button) => button.setIcon("trash-2").setTooltip(this.plugin.text("remove")).onClick(() => { this.binding.commands.splice(index, 1); this.render(); }));
    });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: this.plugin.text("save"), cls: "mod-cta" }).addEventListener("click", async () => {
      await this.plugin.saveSettings(); this.onSaved(); this.close();
    });
  }

  private move(index: number, offset: number): void {
    const target = index + offset;
    if (target < 0 || target >= this.binding.commands.length) return;
    const [item] = this.binding.commands.splice(index, 1);
    if (!item) return;
    this.binding.commands.splice(target, 0, item); this.render();
  }

  override onClose(): void { this.contentEl.empty(); }
}

export class ImportConfigModal extends Modal {
  constructor(app: SpaceCommandPalettePlugin["app"], private readonly plugin: SpaceCommandPalettePlugin, private readonly onImported: () => void) { super(app); }

  override onOpen(): void {
    this.setTitle(this.plugin.text("import"));
    const input = this.contentEl.createEl("textarea", { cls: "space-import-textarea", attr: { placeholder: this.plugin.text("transferDesc") } });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: this.plugin.text("cancel") }).addEventListener("click", () => this.close());
    buttons.createEl("button", { text: this.plugin.text("import"), cls: "mod-cta" }).addEventListener("click", async () => {
      try {
        await this.plugin.importString(input.value.trim());
        new Notice(this.plugin.text("imported")); this.onImported(); this.close();
      } catch { new Notice(this.plugin.text("badImport")); }
    });
    input.focus();
  }

  override onClose(): void { this.contentEl.empty(); }
}

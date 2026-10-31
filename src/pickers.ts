import { FuzzySuggestModal, getIconIds, setIcon } from "obsidian";
import type { App } from "obsidian";
import type { ObsidianCommand } from "./core/types";
import { t } from "./i18n";

export class CommandPicker extends FuzzySuggestModal<ObsidianCommand> {
  constructor(app: App, private readonly commands: ObsidianCommand[], private readonly choose: (command: ObsidianCommand) => void) {
    super(app);
    this.setPlaceholder(t("commandsSearch"));
  }
  getItems(): ObsidianCommand[] { return this.commands; }
  getItemText(item: ObsidianCommand): string { return item.name; }
  onChooseItem(item: ObsidianCommand): void { this.choose(item); }
}

export class IconPicker {
  private popover: HTMLElement | null = null;
  private readonly icons = [...new Set(getIconIds().map((id) => id.replace(/^lucide-/, "")))].sort();
  private onOutside: ((event: MouseEvent) => void) | null = null;
  private onKey: ((event: KeyboardEvent) => void) | null = null;
  private onScroll: ((event: Event) => void) | null = null;

  constructor(private readonly anchor: HTMLElement, private readonly current: string, private readonly choose: (icon: string) => void) {}

  open(): void {
    this.close();
    const host = this.anchor.closest(".vertical-tab-content") ?? document.body;
    const popover = host.createDiv({ cls: "oxpm-icon-popover" });
    this.popover = popover;
    const search = popover.createEl("input", { cls: "oxpm-icon-search", attr: { type: "search", placeholder: t("iconsSearch") } });
    const grid = popover.createDiv({ cls: "oxpm-icon-grid" });
    const render = (): void => {
      grid.empty();
      const query = search.value.trim().toLowerCase();
      const found = this.icons.filter((icon) => !query || icon.includes(query)).slice(0, 180);
      found.forEach((iconId) => {
        const button = grid.createEl("button", { cls: `oxpm-icon-option${iconId === this.current ? " is-selected" : ""}`, attr: { type: "button", title: iconId, "aria-label": iconId } });
        setIcon(button, iconId);
        button.addEventListener("click", () => { this.choose(iconId); this.close(); });
      });
      if (found.length === 0) grid.createDiv({ cls: "oxpm-icon-empty", text: t("nothingFound") });
    };
    search.addEventListener("input", render);
    popover.addEventListener("mousedown", (event) => event.stopPropagation());
    render();
    this.place();
    this.onOutside = (event) => { if (this.popover && !this.popover.contains(event.target as Node) && event.target !== this.anchor) this.close(); };
    this.onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
      this.anchor.focus();
    };
    this.onScroll = (event) => { if (this.popover && !this.popover.contains(event.target as Node)) this.close(); };
    window.setTimeout(() => {
      search.focus();
      document.addEventListener("mousedown", this.onOutside!);
      document.addEventListener("keydown", this.onKey!);
      window.addEventListener("scroll", this.onScroll!, true);
    }, 0);
  }

  private place(): void {
    if (!this.popover) return;
    this.popover.setCssStyles({ left: "0px", top: "0px" });
    const zero = this.popover.getBoundingClientRect();
    const rect = this.anchor.getBoundingClientRect();
    const width = this.popover.offsetWidth;
    const height = this.popover.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.left));
    const top = rect.bottom + height + 8 > viewportHeight
      ? Math.max(8, rect.top - height - 6)
      : rect.bottom + 6;
    this.popover.setCssStyles({ left: `${left - zero.left}px`, top: `${top - zero.top}px` });
  }

  close(): void {
    if (this.onOutside) document.removeEventListener("mousedown", this.onOutside);
    if (this.onKey) document.removeEventListener("keydown", this.onKey);
    if (this.onScroll) window.removeEventListener("scroll", this.onScroll, true);
    this.onOutside = null; this.onKey = null; this.onScroll = null;
    this.popover?.remove(); this.popover = null;
  }
}


import { Notice, setIcon } from "obsidian";
import type { CommandFolder, PieItem } from "./core/types";
import { annularSectorPolygon, radialSlotCount, sectorPolygon } from "./core/geometry";
import { t } from "./i18n";

export class PieMenu {
  private overlay: HTMLElement | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  private audio: AudioContext | null = null;
  private sounds = true;
  private activeFolder: CommandFolder | null = null;
  private rootButtons = new Map<PieItem, HTMLButtonElement>();
  private submenuButtons: HTMLButtonElement[] = [];
  private menuCenter = { x: 0, y: 0 };
  private menuRadius = 92;

  constructor(private readonly execute: (id: string) => boolean) {}

  open(items: PieItem[], point: { x: number; y: number }, radius: number, sounds = true): void {
    this.close();
    const overlay = document.body.createDiv({ cls: "oxpm-overlay" });
    this.overlay = overlay;
    this.sounds = sounds;
    this.activeFolder = null;
    this.rootButtons.clear();
    this.submenuButtons = [];
    overlay.addEventListener("mousedown", (event) => { if (event.target === overlay) this.close(); });
    this.keyHandler = (event) => { if (event.key === "Escape") this.close(); };
    document.addEventListener("keydown", this.keyHandler);
    this.renderMenu(items, point, radius, null);
  }

  close(): void {
    if (this.keyHandler) document.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
    this.overlay?.remove();
    this.overlay = null;
    this.rootButtons.clear();
    this.submenuButtons = [];
    this.activeFolder = null;
  }

  destroy(): void {
    this.close();
    if (this.audio) void this.audio.close();
    this.audio = null;
  }

  private renderMenu(items: PieItem[], point: { x: number; y: number }, radius: number, activeFolder: CommandFolder | null): void {
    const overlay = this.overlay;
    if (!overlay) return;
    overlay.empty();
    const safe = this.safeCenter(point, radius, activeFolder !== null);
    this.menuCenter = safe;
    this.menuRadius = radius;
    const center = overlay.createEl("button", { cls: "oxpm-center", attr: { type: "button", "aria-label": t("close") } });
    center.setCssStyles({ left: `${safe.x}px`, top: `${safe.y}px` });
    setIcon(center, "x");
    center.addEventListener("click", () => this.close());

    if (items.length === 0) {
      const empty = overlay.createDiv({ cls: "oxpm-empty" });
      empty.setCssStyles({ left: `${safe.x}px`, top: `${safe.y + 58}px` });
      empty.createDiv({ cls: "oxpm-empty-title", text: t("empty") });
      empty.createDiv({ cls: "oxpm-empty-hint", text: t("emptyHint") });
      return;
    }

    const outerRadius = radius;
    const innerRadius = Math.max(40, Math.round(radius * 0.56));
    const slotCount = radialSlotCount(items.length);
    items.forEach((item, index) => {
      const angle = -Math.PI / 2 + ((index + 0.5) * Math.PI * 2) / slotCount;
      const iconRadius = (innerRadius + outerRadius) / 2;
      const label = item.type === "folder" ? item.label : this.commandNames.get(item.commandId) ?? item.label ?? item.commandId;
      const button = this.createSector(
        overlay, safe, outerRadius, sectorPolygon(index, slotCount, outerRadius, innerRadius),
        angle, iconRadius, item.icon, item.color, label, index, "oxpm-sector",
      );
      this.rootButtons.set(item, button);
      if (item === activeFolder) button.addClass("is-active");
      if (item.type === "folder") {
        button.addEventListener("click", () => {
          this.playClick();
          this.activeFolder === item ? this.hideSubmenu() : this.showSubmenu(item);
        });
      } else {
        button.addEventListener("click", () => {
          this.playClick();
          this.close();
          if (!this.execute(item.commandId)) new Notice(t("unavailable"));
        });
      }
    });

    if (activeFolder) this.renderSubmenu(overlay, items, activeFolder, safe, radius);
  }

  private showSubmenu(folder: CommandFolder): void {
    if (!this.overlay) return;
    this.removeSubmenu();
    this.activeFolder = folder;
    this.rootButtons.forEach((button, item) => button.toggleClass("is-active", item === folder));
    this.renderSubmenu(this.overlay, this.rootItems, folder, this.menuCenter, this.menuRadius);
  }

  private hideSubmenu(): void {
    this.removeSubmenu();
    this.activeFolder = null;
    this.rootButtons.forEach((button) => button.removeClass("is-active"));
  }

  private removeSubmenu(): void {
    this.submenuButtons.forEach((button) => button.remove());
    this.submenuButtons = [];
  }

  private renderSubmenu(
    overlay: HTMLElement,
    rootItems: PieItem[],
    folder: CommandFolder,
    center: { x: number; y: number },
    rootRadius: number,
  ): void {
    const folderIndex = rootItems.indexOf(folder);
    if (folderIndex < 0 || folder.children.length === 0) return;
    const slotCount = radialSlotCount(rootItems.length);
    const folderAngle = -Math.PI / 2 + ((folderIndex + 0.5) * Math.PI * 2) / slotCount;
    const count = folder.children.length;
    const fanSpan = Math.min(Math.PI * 0.92, Math.max(0.7, count * 0.48));
    const segment = fanSpan / count;
    const innerRadius = rootRadius + 6;
    const outerRadius = rootRadius + 46;
    const start = folderAngle - fanSpan / 2;

    folder.children.forEach((item, index) => {
      const sectorStart = start + index * segment;
      const sectorEnd = sectorStart + segment;
      const angle = (sectorStart + sectorEnd) / 2;
      const iconRadius = (innerRadius + outerRadius) / 2;
      const label = this.commandNames.get(item.commandId) ?? item.label ?? item.commandId;
      const button = this.createSector(
        overlay, center, outerRadius,
        annularSectorPolygon(sectorStart, sectorEnd, outerRadius, innerRadius),
        angle, iconRadius, item.icon, item.color ?? folder.color, label, index,
        "oxpm-sector oxpm-submenu-sector",
      );
      this.submenuButtons.push(button);
      button.addEventListener("click", () => {
        this.playClick();
        this.close();
        if (!this.execute(item.commandId)) new Notice(t("unavailable"));
      });
    });
  }

  private createSector(
    overlay: HTMLElement,
    center: { x: number; y: number },
    outerRadius: number,
    clipPath: string,
    angle: number,
    iconRadius: number,
    iconId: string,
    color: string | undefined,
    label: string,
    index: number,
    className: string,
  ): HTMLButtonElement {
    const diameter = outerRadius * 2;
    const button = overlay.createEl("button", { cls: className, attr: { type: "button", "aria-label": label } });
    button.setCssStyles({ left: `${center.x}px`, top: `${center.y}px`, width: `${diameter}px`, height: `${diameter}px`, clipPath });
    button.style.setProperty("--oxpm-sector-color", color ?? "var(--interactive-accent)");
    button.style.setProperty("--oxpm-sector-index", String(index));
    const icon = button.createSpan({ cls: "oxpm-sector-icon" });
    icon.setCssStyles({ left: `${outerRadius + Math.cos(angle) * iconRadius}px`, top: `${outerRadius + Math.sin(angle) * iconRadius}px` });
    setIcon(icon, iconId || "command");
    button.addEventListener("pointerenter", () => this.playSwipe());
    return button;
  }

  private audioContext(): AudioContext | null {
    if (!this.sounds) return null;
    this.audio ??= new AudioContext();
    if (this.audio.state === "suspended") void this.audio.resume();
    return this.audio;
  }

  private playSwipe(): void {
    const audio = this.audioContext();
    if (!audio) return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(430, now);
    oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.055);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.07);
  }

  private playClick(): void {
    const audio = this.audioContext();
    if (!audio) return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1150, now);
    oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.04);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  private rootItems: PieItem[] = [];
  private commandNames = new Map<string, string>();

  setContext(items: PieItem[], names: Map<string, string>): void {
    this.rootItems = items;
    this.commandNames = names;
  }

  private safeCenter(point: { x: number; y: number }, radius: number, hasSubmenu: boolean): { x: number; y: number } {
    const margin = radius + (hasSubmenu ? 68 : 12);
    return {
      x: Math.max(margin, Math.min(window.innerWidth - margin, point.x)),
      y: Math.max(margin, Math.min(window.innerHeight - margin, point.y))
    };
  }
}


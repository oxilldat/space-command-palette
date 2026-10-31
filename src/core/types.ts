export type TriggerMode = "single" | "double";
export type Language = "ru" | "en" | "zh";

export interface CommandItem {
  type: "command";
  commandId: string;
  label?: string;
  icon: string;
  color?: string;
}

export interface CommandFolder {
  type: "folder";
  id: string;
  label: string;
  icon: string;
  color?: string;
  children: CommandItem[];
}

export type PieItem = CommandItem | CommandFolder;

export interface WorkspaceMenu {
  workspaceName: string;
  items: PieItem[];
}

export interface WorkspaceBinding {
  workspaceName: string;
  commands: string[];
}

export interface PieMenuSettings {
  language: Language;
  locale: "ru" | "en";
  triggerMode: TriggerMode;
  doublePressDelay: number;
  radius: number;
  sounds: boolean;
  spaceConnectorEnabled: boolean;
  workspaceMenus: WorkspaceMenu[];
  bindings: WorkspaceBinding[];
  workspaceIcons: Record<string, string>;
  items: PieItem[];
}

export interface ObsidianCommand {
  id: string;
  name: string;
  icon?: string;
}


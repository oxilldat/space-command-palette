import type { App } from "obsidian";
import type { ObsidianCommand } from "./core/types";

interface CommandManager {
  listCommands(): ObsidianCommand[];
  executeCommandById(id: string): boolean;
}

interface AppWithCommands extends App { commands: CommandManager; }

/** Isolates Obsidian's internal command registry behind one compatibility boundary. */
export class CommandRegistry {
  constructor(private readonly app: App) {}

  list(): ObsidianCommand[] {
    const manager = (this.app as AppWithCommands).commands;
    if (!manager?.listCommands) return [];
    return manager.listCommands().map((command) => ({
      id: command.id,
      name: command.name,
      icon: command.icon
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  execute(id: string): boolean {
    return (this.app as AppWithCommands).commands?.executeCommandById?.(id) ?? false;
  }
}


import type { App } from "obsidian";

interface WorkspacesInstance {
  activeWorkspace?: string;
  workspaces?: Record<string, unknown>;
  deleteWorkspace?: (name: string) => Promise<void>;
  saveData?: () => Promise<void>;
}

interface InternalPlugin {
  enabled?: boolean;
  instance?: WorkspacesInstance;
}

interface AppWithInternalPlugins extends App {
  internalPlugins?: { plugins?: Record<string, InternalPlugin> };
}

export class WorkspaceConnector {
  constructor(private readonly app: App) {}

  isAvailable(): boolean { return this.instance() !== null; }

  getActiveWorkspaceName(): string | null {
    const name = this.instance()?.activeWorkspace;
    return typeof name === "string" && name.trim() ? name : null;
  }

  getWorkspaceNames(): string[] {
    const workspaces = this.instance()?.workspaces;
    return workspaces && typeof workspaces === "object" ? Object.keys(workspaces).sort((a, b) => a.localeCompare(b)) : [];
  }

  async renameWorkspace(currentName: string, nextName: string): Promise<boolean> {
    const instance = this.instance();
    const workspaces = instance?.workspaces;
    if (!instance || !workspaces || !Object.hasOwn(workspaces, currentName) || Object.hasOwn(workspaces, nextName) || !instance.saveData) return false;
    workspaces[nextName] = workspaces[currentName];
    delete workspaces[currentName];
    if (instance.activeWorkspace === currentName) instance.activeWorkspace = nextName;
    await instance.saveData();
    return true;
  }

  async deleteWorkspace(name: string): Promise<boolean> {
    const instance = this.instance();
    if (!instance?.workspaces || !Object.hasOwn(instance.workspaces, name) || !instance.deleteWorkspace) return false;
    await instance.deleteWorkspace(name);
    if (instance.activeWorkspace === name) {
      instance.activeWorkspace = "";
      await instance.saveData?.();
    }
    return true;
  }

  private instance(): WorkspacesInstance | null {
    const plugin = (this.app as AppWithInternalPlugins).internalPlugins?.plugins?.workspaces;
    return plugin?.enabled && plugin.instance ? plugin.instance : null;
  }
}

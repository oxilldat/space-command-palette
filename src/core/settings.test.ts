import assert from "node:assert/strict";
import test from "node:test";
import { FOLDER_ID_PATTERN, nextFolderId, normalizeSettings } from "./settings";

test("folder identifiers contain Latin letters only", () => {
  assert.equal(FOLDER_ID_PATTERN.test("writing"), true);
  assert.equal(FOLDER_ID_PATTERN.test("writing2"), false);
  assert.equal(FOLDER_ID_PATTERN.test("writing_tools"), false);
  assert.equal(FOLDER_ID_PATTERN.test("письмо"), false);
});

test("new folder identifiers stay unique and contain letters only", () => {
  const used = new Set(["folder", "foldera", "folderb", "folderz"]);
  assert.equal(nextFolderId(used), "folderc");
  const many = new Set(["folder", ...Array.from({ length: 26 }, (_, index) => `folder${String.fromCharCode(97 + index)}`)]);
  assert.equal(nextFolderId(many), "folderaa");
});

test("normalization rejects invalid and duplicate folders", () => {
  const settings = normalizeSettings({ items: [
    { type: "folder", id: "work", label: "Work", children: [] },
    { type: "folder", id: "work", label: "Again", children: [] },
    { type: "folder", id: "bad-2", label: "Bad", children: [] },
    { type: "command", commandId: "app:reload" }
  ]});
  assert.deepEqual(settings.items.map((item) => item.type), ["folder", "command"]);
});

test("numeric settings are clamped", () => {
  const settings = normalizeSettings({ doublePressDelay: 10, radius: 999 });
  assert.equal(settings.doublePressDelay, 200);
  assert.equal(settings.radius, 140);
});

test("custom colors are preserved and invalid colors are discarded", () => {
  const settings = normalizeSettings({ items: [
    { type: "command", commandId: "valid", icon: "command", color: "#12aBcF" },
    { type: "command", commandId: "invalid", icon: "command", color: "white" }
  ]});
  assert.equal(settings.items[0]?.color, "#12aBcF");
  assert.equal(settings.items[1]?.color, undefined);
});

test("workspace menus are normalized independently", () => {
  const settings = normalizeSettings({
    spaceConnectorEnabled: true,
    workspaceMenus: [
      { workspaceName: "Writing", items: [{ type: "folder", id: "tools", label: "Tools", children: [] }] },
      { workspaceName: "Research", items: [{ type: "folder", id: "tools", label: "Tools", children: [] }] },
      { workspaceName: "Writing", items: [{ type: "command", commandId: "duplicate" }] },
      { workspaceName: "", items: [] }
    ]
  });
  assert.equal(settings.spaceConnectorEnabled, true);
  assert.deepEqual(settings.workspaceMenus.map((menu) => menu.workspaceName), ["Writing", "Research"]);
  assert.equal(settings.workspaceMenus[0]?.items.length, 1);
  assert.equal(settings.workspaceMenus[1]?.items.length, 1);
});

test("workspace menus stay enabled for older settings", () => {
  const settings = normalizeSettings({ items: [] });
  assert.equal(settings.spaceConnectorEnabled, true);
  assert.deepEqual(settings.workspaceMenus, []);
});

test("legacy Space Command Palette bindings are preserved", () => {
  const settings = normalizeSettings({ language: "zh", bindings: [
    { workspaceName: "Writing", commands: ["one", "one", "two"] }
  ] });
  assert.equal(settings.language, "zh");
  assert.deepEqual(settings.bindings, [{ workspaceName: "Writing", commands: ["one", "two"] }]);
});


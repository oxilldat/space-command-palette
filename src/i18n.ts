const ru = {
  open: "Открыть круговое меню",
  empty: "Меню пока пустое",
  emptyHint: "Добавьте команды ниже, чтобы собрать круговое меню",
  unavailable: "Команда больше недоступна",
  settingsLanguage: "Язык",
  settingsTrigger: "Срабатывание хоткея",
  settingsSingle: "Одно нажатие",
  settingsDouble: "Двойное нажатие",
  settingsDelay: "Интервал двойного нажатия",
  settingsDelayDesc: "Допустимая пауза между нажатиями, мс.",
  settingsRadius: "Размер меню",
  settingsRadiusDesc: "Расстояние от центра до секторов.",
  settingsSounds: "Звуки меню",
  settingsSoundsDesc: "Смахивание при смене сектора и щелчок при выборе.",
  spaceConnector: "Коннектор Space Command Palette",
  spaceConnectorDesc: "Отдельное круговое меню для каждого Workspace.",
  spaceConnectorMissing: "Установите и включите Space Command Palette, чтобы использовать отдельные меню Workspace.",
  workspaceMenu: "Настраиваемое Workspace",
  workspaceMenuDesc: "Выберите глобальное меню или меню конкретного Workspace.",
  defaultMenu: "Глобальное меню",
  missingWorkspace: "отсутствует",
  settingsHotkey: "Горячая клавиша",
  settingsHotkeyDesc: "Назначьте хоткей команде «Открыть круговое меню» в разделе «Горячие клавиши» Obsidian.",
  editorTitle: "Секторы меню",
  generalTitle: "Основное",
  editorDesc: "Перетаскивайте карточки, чтобы менять порядок. Папка открывает второй круг команд.",
  addCommand: "Добавить команду",
  addFolder: "Добавить папку",
  addToFolder: "Добавить команду",
  folderName: "Название",
  folder: "Папка",
  folderCommands: "Команды папки",
  folderEmpty: "В папке пока нет команд",
  commandsCount: "команд",
  back: "Назад к секторам",
  openFolder: "Открыть папку",
  folderId: "ID папки",
  folderIdHint: "Только латинские буквы, без цифр и символов.",
  folderInvalid: "ID должен состоять только из латинских букв и быть уникальным",
  icon: "Иконка",
  changeIcon: "Выбрать иконку",
  color: "Цвет сектора",
  accentColor: "Использовать акцентный цвет",
  remove: "Удалить",
  moveUp: "Выше",
  moveDown: "Ниже",
  commandsSearch: "Поиск команды…",
  iconsSearch: "Поиск иконки…",
  nothingFound: "Ничего не найдено",
  commandMissing: "Недоступная команда",
  preview: "Предпросмотр",
  close: "Закрыть"
  ,settingsSectionGeneral: "Основные"
  ,settingsSectionPalettes: "Палитры"
  ,settingsSectionRadial: "Круговое меню"
  ,workspacesTitle: "Пространства"
  ,activeWorkspace: "активно"
  ,globalWorkspaceHint: "По умолчанию"
  ,paletteTitle: "Команды палитры"
  ,paletteDesc: "Команды, доступные в контекстной палитре выбранного пространства."
  ,renameWorkspace: "Переименовать"
  ,deleteWorkspace: "Удалить"
  ,renameWorkspaceTitle: "Переименовать пространство"
  ,deleteWorkspaceTitle: "Удалить пространство?"
  ,deleteWorkspaceDesc: "Пространство будет удалено из Obsidian вместе с настройками палитры и кругового меню."
  ,workspaceName: "Название пространства"
  ,workspaceExists: "Пространство с таким названием уже существует"
  ,workspaceActionFailed: "Не удалось изменить пространство"
  ,confirmDelete: "Удалить"
  ,cancel: "Отмена"
} as const;

type Key = keyof typeof ru;
const en: Record<Key, string> = {
  open: "Open radial menu", empty: "The menu is empty", emptyHint: "Add commands below to build the radial menu",
  unavailable: "This command is no longer available", settingsLanguage: "Language", settingsTrigger: "Hotkey trigger",
  settingsSingle: "Single press", settingsDouble: "Double press", settingsDelay: "Double-press interval",
  settingsDelayDesc: "Allowed delay between presses, ms.", settingsRadius: "Menu size",
  settingsRadiusDesc: "Distance from the center to each sector.", settingsHotkey: "Hotkey",
  settingsSounds: "Menu sounds", settingsSoundsDesc: "A swipe when changing sectors and a click on selection.",
  spaceConnector: "Space Command Palette connector", spaceConnectorDesc: "Use a separate radial menu for each Workspace.",
  spaceConnectorMissing: "Install and enable Space Command Palette to use separate Workspace menus.",
  workspaceMenu: "Workspace to configure", workspaceMenuDesc: "Choose the global menu or a menu for a specific Workspace.",
  defaultMenu: "Global menu", missingWorkspace: "missing",
  settingsHotkeyDesc: "Assign a hotkey to “Open radial menu” in Obsidian’s Hotkeys settings.",
  generalTitle: "General",
  editorTitle: "Menu sectors", editorDesc: "Drag cards to reorder them. A folder opens a second ring of commands.",
  addCommand: "Add command", addFolder: "Add folder", addToFolder: "Add command", folderName: "Name",
  folder: "Folder", folderCommands: "Folder commands", folderEmpty: "This folder has no commands yet",
  commandsCount: "commands", back: "Back to sectors", openFolder: "Open folder",
  folderId: "Folder ID", folderIdHint: "Latin letters only, with no digits or symbols.",
  folderInvalid: "The ID must contain unique Latin letters only", icon: "Icon", changeIcon: "Choose icon",
  remove: "Remove", moveUp: "Move up", moveDown: "Move down", commandsSearch: "Search commands…",
  color: "Sector color", accentColor: "Use accent color",
  iconsSearch: "Search icons…", nothingFound: "Nothing found", commandMissing: "Unavailable command",
  preview: "Preview", close: "Close",
  settingsSectionGeneral: "General", settingsSectionPalettes: "Palettes", settingsSectionRadial: "Radial menu",
  workspacesTitle: "Workspaces", activeWorkspace: "active", globalWorkspaceHint: "Default",
  paletteTitle: "Palette commands", paletteDesc: "Commands available in the contextual palette for the selected Workspace.",
  renameWorkspace: "Rename", deleteWorkspace: "Delete", renameWorkspaceTitle: "Rename Workspace",
  deleteWorkspaceTitle: "Delete Workspace?", deleteWorkspaceDesc: "The Workspace will be removed from Obsidian together with its palette and radial-menu settings.",
  workspaceName: "Workspace name", workspaceExists: "A Workspace with this name already exists",
  workspaceActionFailed: "Could not change the Workspace", confirmDelete: "Delete", cancel: "Cancel"
};

let catalog: Record<Key, string> = en;
export function setLocale(locale: "ru" | "en"): void { catalog = locale === "ru" ? ru : en; }
export function t(key: Key): string { return catalog[key]; }


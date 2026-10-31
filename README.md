# Space Command Palette

[Русский](#русский) · [English](#english)

## Русский

**Space Command Palette** — контекстная палитра и круговое меню команд для Obsidian. Плагин связывает сохранённые пространства (`Workspaces`) с отдельными наборами команд: при переключении рабочего контекста меняются и обычная палитра, и radial menu.

> Только для настольной версии Obsidian 1.13.0+.

<!-- СКРИНШОТ 1: круговое меню поверх рабочего пространства -->

### Возможности

- отдельная палитра команд для каждого сохранённого пространства;
- полностью настраиваемое круговое меню у курсора;
- команды и вложенные папки команд в секторах;
- выбор иконки и акцентного цвета для каждого сектора;
- единичное или двойное нажатие назначенного хоткея;
- анимация появления, звуки переключения и выбора;
- интерактивный предпросмотр в настройках;
- иконки пространств, переименование и удаление Workspace через контекстное меню;
- импорт и экспорт конфигурации;
- русский, английский и китайский интерфейс палитры;
- локальное хранение без телеметрии и сетевых запросов.

<!-- СКРИНШОТ 2: настройки пространства, палитры и кругового меню -->

### Установка и настройка

Скопируйте `main.js`, `manifest.json` и `styles.css` в `<vault>/.obsidian/plugins/space-command-palette/`, перезапустите Obsidian и включите плагин.

1. Включите встроенный плагин Obsidian **«Пространства»** и сохраните хотя бы одну компоновку.
2. Откройте `Настройки → Space Command Palette`.
3. Выберите глобальное меню или конкретное пространство.
4. Настройте команды палитры и сектора кругового меню.
5. Назначьте хоткеи командам **Open contextual command palette** и **Open radial menu** в настройках Obsidian.

Если для активного пространства нет отдельной конфигурации, круговое меню использует глобальный набор, а обычная палитра открывает стандартную палитру Obsidian.

Данные плагина хранятся в `.obsidian/plugins/space-command-palette/data.json`; заметки не изменяются. Переименование и удаление Workspace через контекстное меню синхронно изменяет сохранённые пространства встроенного плагина Obsidian. Настройки версий 0.1.x мигрируют автоматически.

> Obsidian не предоставляет публичный API активного сохранённого пространства. Для определения контекста используется внутренний экземпляр `workspaces`, поэтому после крупных обновлений Obsidian может потребоваться обновление совместимости.

---

## English

**Space Command Palette** is a contextual command palette and radial command menu for Obsidian. It assigns independent command sets to saved Workspaces, so both the palette and the pie menu follow your current working context.

> Desktop-only. Requires Obsidian 1.13.0 or newer.

<!-- SCREENSHOT 1: radial menu over an active workspace -->

Features include per-workspace command palettes, a cursor-centered radial menu, nested command folders, configurable icons and colors, Workspace rename/delete actions, single or double hotkey activation, animation and optional sounds, an interactive settings preview, configuration import/export, and local-only storage without telemetry.

<!-- SCREENSHOT 2: workspace, palette, and radial-menu settings -->

Install `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/space-command-palette/`, restart Obsidian, and enable the plugin. Enable Obsidian's built-in Workspaces plugin, choose a global or saved-workspace configuration in settings, then assign hotkeys to **Open contextual command palette** and **Open radial menu**.

If the active Workspace has no custom radial menu, the global menu is used. If it has no contextual palette, Obsidian's standard command palette opens. Existing 0.1.x settings are migrated automatically.

## License

MIT © 2026 oxill. See [LICENSE](LICENSE).

const { Plugin, PluginSettingTab, Setting, FuzzySuggestModal, Modal, Notice } = require("obsidian");

const DEFAULT_SETTINGS = { language: "ru", bindings: [] };
const TEXT = {
  ru: { settings:"Палитра пространств",language:"Язык",languageDesc:"Язык интерфейса плагина.",transfer:"Импорт и экспорт",transferDesc:"Конфигурация одной строкой. Вставьте строку для импорта или скопируйте текущую.",import:"Импортировать",export:"Экспортировать",copied:"Конфигурация скопирована",imported:"Конфигурация импортирована",badImport:"Не удалось импортировать конфигурацию",editor:"Редактор пространств",editorDesc:"Добавьте нужные компоновки встроенного плагина «Пространства» и настройте их команды.",add:"Добавить палитру",noAvailable:"Все доступные пространства уже добавлены",noBindings:"Привязок пока нет.",chooseWorkspace:"Выбрать пространство…",missing:"Пространство не найдено",chooseCommands:"Выбрать команды",pinned:"Расположение",remove:"Удалить",commandPicker:"Команды для пространства",commandSearch:"Поиск команд…",save:"Сохранить",cancel:"Отмена",selected:"Выбрано",pinnedTitle:"Расположение команд",emptyPinned:"Команды пока не выбраны.",up:"Вверх",down:"Вниз",unavailable:"Недоступно",coreMissing:"Встроенный плагин «Пространства» не включён",noMapping:"Для активного пространства палитра не настроена",palette:"Выберите команду…",statusMissing:"Пространства: не подключены",statusNone:"Пространство: не выбрано" },
  en: { settings:"Space Command Palette",language:"Language",languageDesc:"Plugin interface language.",transfer:"Import and export",transferDesc:"A single-line configuration. Paste it to import or copy the current setup.",import:"Import",export:"Export",copied:"Configuration copied",imported:"Configuration imported",badImport:"Could not import configuration",editor:"Workspace editor",editorDesc:"Add layouts from Obsidian's built-in Workspaces plugin and configure their commands.",add:"Add workspace",noAvailable:"All available workspaces are already added",noBindings:"No workspace bindings yet.",chooseWorkspace:"Choose a workspace…",missing:"Workspace not found",chooseCommands:"Choose commands",pinned:"Order",remove:"Remove",commandPicker:"Workspace commands",commandSearch:"Search commands…",save:"Save",cancel:"Cancel",selected:"Selected",pinnedTitle:"Command order",emptyPinned:"No commands selected yet.",up:"Move up",down:"Move down",unavailable:"Unavailable",coreMissing:"The built-in Workspaces plugin is disabled",noMapping:"The active workspace has no configured palette",palette:"Choose a command…",statusMissing:"Workspaces: disconnected",statusNone:"Workspace: none" },
  zh: { settings:"空间命令面板",language:"语言",languageDesc:"插件界面语言。",transfer:"导入和导出",transferDesc:"单行配置。粘贴以导入，或复制当前配置。",import:"导入",export:"导出",copied:"配置已复制",imported:"配置已导入",badImport:"无法导入配置",editor:"空间编辑器",editorDesc:"添加 Obsidian 内置工作区并配置其命令。",add:"添加空间",noAvailable:"所有可用空间均已添加",noBindings:"尚无空间绑定。",chooseWorkspace:"选择空间…",missing:"找不到空间",chooseCommands:"选择命令",pinned:"排序",remove:"删除",commandPicker:"空间命令",commandSearch:"搜索命令…",save:"保存",cancel:"取消",selected:"已选择",pinnedTitle:"命令排序",emptyPinned:"尚未选择命令。",up:"上移",down:"下移",unavailable:"不可用",coreMissing:"内置工作区插件未启用",noMapping:"当前空间尚未配置命令面板",palette:"选择命令…",statusMissing:"空间：未连接",statusNone:"空间：未选择" }
};

const AUTHOR_TEXT={
  ru:{general:"Основное",title:"Нравится плагин?",body:"Поддержите проект или подпишитесь"},
  en:{general:"General",title:"Enjoying the plugin?",body:"Support the project or follow me"},
  zh:{general:"常规",title:"喜欢这个插件吗？",body:"支持项目或关注我"}
};

class ItemPicker extends FuzzySuggestModal {
  constructor(app, items, getText, onPick, placeholder) { super(app); this.items=items; this.getText=getText; this.onPick=onPick; this.setPlaceholder(placeholder); }
  getItems(){ return this.items; }
  getItemText(item){ return this.getText(item); }
  onChooseItem(item){ this.onPick(item); }
}

class CommandPickerModal extends Modal {
  constructor(app, plugin, binding, onSaved){ super(app); this.plugin=plugin; this.binding=binding; this.onSaved=onSaved; this.selected=new Set(binding.commands); this.query=""; }
  onOpen(){
    this.setTitle(this.plugin.t("commandPicker"));
    this.contentEl.addClass("space-command-picker");
    const search=this.contentEl.createEl("input",{type:"search",placeholder:this.plugin.t("commandSearch"),cls:"space-command-search"});
    this.counterEl=this.contentEl.createDiv({cls:"space-command-counter"});
    this.listEl=this.contentEl.createDiv({cls:"space-command-list"});
    search.addEventListener("input",()=>{this.query=search.value.trim().toLocaleLowerCase();this.renderList();});
    const buttons=this.contentEl.createDiv({cls:"modal-button-container"});
    buttons.createEl("button",{text:this.plugin.t("cancel")}).addEventListener("click",()=>this.close());
    buttons.createEl("button",{text:this.plugin.t("save"),cls:"mod-cta"}).addEventListener("click",async()=>{
      const allIds=new Set(this.plugin.getAllCommands().map(c=>c.id));
      const ordered=this.binding.commands.filter(id=>this.selected.has(id)&&allIds.has(id));
      const added=[...this.selected].filter(id=>!ordered.includes(id)&&allIds.has(id));
      this.binding.commands=[...ordered,...added]; await this.plugin.saveSettings(); this.onSaved(); this.close();
    });
    this.renderList(); search.focus();
  }
  renderList(){
    this.listEl.empty();
    const commands=this.plugin.getAllCommands().filter(c=>!this.query||`${c.name} ${c.id}`.toLocaleLowerCase().includes(this.query));
    this.counterEl.setText(`${this.plugin.t("selected")}: ${this.selected.size}`);
    for(const command of commands){
      const label=this.listEl.createEl("label",{cls:"space-command-option"});
      const checkbox=label.createEl("input",{type:"checkbox"}); checkbox.checked=this.selected.has(command.id);
      checkbox.addEventListener("change",()=>{checkbox.checked?this.selected.add(command.id):this.selected.delete(command.id);this.counterEl.setText(`${this.plugin.t("selected")}: ${this.selected.size}`);});
      const text=label.createDiv(); text.createDiv({text:command.name,cls:"space-command-name"}); text.createDiv({text:command.id,cls:"space-command-id"});
    }
  }
  onClose(){this.contentEl.empty();}
}

class PinnedCommandsModal extends Modal {
  constructor(app,plugin,binding,onSaved){super(app);this.plugin=plugin;this.binding=binding;this.onSaved=onSaved;}
  onOpen(){this.setTitle(this.plugin.t("pinnedTitle"));this.contentEl.addClass("space-pinned-editor");this.render();}
  render(){
    this.contentEl.empty();
    if(!this.binding.commands.length)this.contentEl.createDiv({text:this.plugin.t("emptyPinned"),cls:"setting-item-description"});
    this.binding.commands.forEach((id,index)=>{
      const command=this.plugin.getCommand(id);const row=new Setting(this.contentEl).setName(command?command.name:`${this.plugin.t("unavailable")}: ${id}`).setDesc(id);
      row.addExtraButton(b=>b.setIcon("arrow-up").setTooltip(this.plugin.t("up")).setDisabled(index===0).onClick(()=>this.move(index,-1)));
      row.addExtraButton(b=>b.setIcon("arrow-down").setTooltip(this.plugin.t("down")).setDisabled(index===this.binding.commands.length-1).onClick(()=>this.move(index,1)));
      row.addExtraButton(b=>b.setIcon("trash-2").setTooltip(this.plugin.t("remove")).onClick(()=>this.remove(index)));
    });
    const buttons=this.contentEl.createDiv({cls:"modal-button-container"});
    buttons.createEl("button",{text:this.plugin.t("save"),cls:"mod-cta"}).addEventListener("click",async()=>{await this.plugin.saveSettings();this.onSaved();this.close();});
  }
  move(index,delta){const target=index+delta;if(target<0||target>=this.binding.commands.length)return;const[item]=this.binding.commands.splice(index,1);this.binding.commands.splice(target,0,item);this.render();}
  remove(index){this.binding.commands.splice(index,1);this.render();}
  onClose(){this.contentEl.empty();}
}

class ImportConfigModal extends Modal {
  constructor(app,plugin,onImported){super(app);this.plugin=plugin;this.onImported=onImported;}
  onOpen(){
    this.setTitle(this.plugin.t("import"));
    const input=this.contentEl.createEl("textarea",{cls:"space-import-textarea",attr:{placeholder:this.plugin.t("transferDesc")}});
    const buttons=this.contentEl.createDiv({cls:"modal-button-container"});
    buttons.createEl("button",{text:this.plugin.t("cancel")}).addEventListener("click",()=>this.close());
    buttons.createEl("button",{text:this.plugin.t("import"),cls:"mod-cta"}).addEventListener("click",async()=>{
      try{await this.plugin.importString(input.value.trim());new Notice(this.plugin.t("imported"));this.onImported();this.close();}
      catch(error){console.error("Space Command Palette import failed",error);new Notice(this.plugin.t("badImport"));}
    });
    input.focus();
  }
  onClose(){this.contentEl.empty();}
}

module.exports=class SpaceCommandPalettePlugin extends Plugin{
  async onload(){
    await this.loadSettings();this.workspaceInstance=null;this.lastWorkspaceName=undefined;
    this.statusBar=this.addStatusBarItem();this.statusBar.addClass("space-command-palette-status");this.statusBar.addEventListener("click",()=>this.openPalette());
    this.addRibbonIcon("list-filter","Space Command Palette",()=>this.openPalette());
    this.addCommand({id:"open-palette",name:"Open active workspace palette",hotkeys:[{modifiers:["Ctrl","Shift"],key:"P"}],callback:()=>this.openPalette()});
    this.addSettingTab(new SpacePaletteSettingsTab(this.app,this));
    this.app.workspace.onLayoutReady(()=>this.bindWorkspaces());
    this.registerEvent(this.app.workspace.on("layout-change",()=>this.syncWorkspace()));
    this.registerInterval(window.setInterval(()=>{if(!this.workspaceInstance)this.bindWorkspaces();this.syncWorkspace();},500));
    this.bindWorkspaces();this.updateUi();
  }
  onunload(){this.workspaceInstance=null;}
  t(key){return(TEXT[this.settings.language]||TEXT.en)[key]||TEXT.en[key]||key;}
  async loadSettings(){
    const saved=await this.loadData();this.settings={...DEFAULT_SETTINGS,...(saved||{})};
    if(!Array.isArray(this.settings.bindings))this.settings.bindings=this.migrateBindings(saved);
    this.settings.bindings=this.settings.bindings.filter(b=>b&&typeof b.workspaceName==="string").map(b=>({workspaceName:b.workspaceName,commands:Array.isArray(b.commands)?[...new Set(b.commands.filter(id=>typeof id==="string"))]:[]}));
    if(!TEXT[this.settings.language])this.settings.language="ru";
  }
  migrateBindings(saved){if(!saved||!Array.isArray(saved.spaces))return[];return saved.spaces.map(s=>({workspaceName:s.workspaceName||s.name||s.id,commands:Array.isArray(s.commands)?s.commands:[]}));}
  async saveSettings(){await this.saveData(this.settings);}
  getWorkspacesPlugin(){const registry=this.app.internalPlugins&&this.app.internalPlugins.plugins;return registry?registry.workspaces:null;}
  bindWorkspaces(){const plugin=this.getWorkspacesPlugin();this.workspaceInstance=plugin&&plugin.enabled?plugin.instance:null;this.syncWorkspace(true);return Boolean(this.workspaceInstance);}
  syncWorkspace(force=false){const name=this.getActiveWorkspaceName();if(!force&&name===this.lastWorkspaceName)return;this.lastWorkspaceName=name;this.updateUi();}
  getActiveWorkspaceName(){return this.workspaceInstance&&typeof this.workspaceInstance.activeWorkspace==="string"?this.workspaceInstance.activeWorkspace:null;}
  getWorkspaceNames(){const ws=this.workspaceInstance&&this.workspaceInstance.workspaces;return ws&&typeof ws==="object"?Object.keys(ws):[];}
  getActiveBinding(){const name=this.getActiveWorkspaceName();return name?this.settings.bindings.find(b=>b.workspaceName===name)||null:null;}
  getCommand(id){const registry=this.app.commands;return registry&&registry.commands?registry.commands[id]:null;}
  getAllCommands(){const commands=this.app.commands&&this.app.commands.commands?Object.values(this.app.commands.commands):[];return commands.filter(c=>c&&typeof c.id==="string"&&typeof c.name==="string").sort((a,b)=>a.name.localeCompare(b.name));}
  updateUi(){if(!this.statusBar)return;if(!this.workspaceInstance)return this.statusBar.setText(this.t("statusMissing"));const name=this.getActiveWorkspaceName();this.statusBar.setText(name?`⌘ ${name}`:this.t("statusNone"));}
  openPalette(){
    if(!this.workspaceInstance)return new Notice(this.t("coreMissing"));const binding=this.getActiveBinding();
    if(!binding){new Notice(this.t("noMapping"));this.app.commands.executeCommandById("command-palette:open");return;}
    const items=binding.commands.map(id=>({id,command:this.getCommand(id)})).filter(item=>item.command);
    if(!items.length)return new Notice(this.t("noMapping"));
    new ItemPicker(this.app,items,item=>item.command.name,item=>this.app.commands.executeCommandById(item.id),`${binding.workspaceName}: ${this.t("palette")}`).open();
  }
  exportString(){return JSON.stringify({version:1,language:this.settings.language,bindings:this.settings.bindings});}
  async importString(raw){
    const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.bindings))throw new Error("bindings missing");const seen=new Set(),bindings=[];
    for(const item of parsed.bindings){if(!item||typeof item.workspaceName!=="string"||seen.has(item.workspaceName))continue;seen.add(item.workspaceName);bindings.push({workspaceName:item.workspaceName,commands:Array.isArray(item.commands)?[...new Set(item.commands.filter(id=>typeof id==="string"))]:[]});}
    this.settings.language=TEXT[parsed.language]?parsed.language:this.settings.language;this.settings.bindings=bindings;await this.saveSettings();this.updateUi();
  }
};

class SpacePaletteSettingsTab extends PluginSettingTab{
  constructor(app,plugin){super(app,plugin);this.plugin=plugin;}
  display(){
    const{containerEl}=this;containerEl.empty();
    containerEl.addClass("scp-settings");
    const general=this.createGroup(containerEl,null);
    new Setting(general).setName(this.plugin.t("language")).setDesc(this.plugin.t("languageDesc")).addDropdown(d=>d.addOption("ru","Русский").addOption("en","English").addOption("zh","中文").setValue(this.plugin.settings.language).onChange(async value=>{this.plugin.settings.language=value;await this.plugin.saveSettings();this.plugin.updateUi();this.display();}));
    new Setting(general).setName(this.plugin.t("import")).setDesc(this.plugin.t("transferDesc")).addButton(b=>b.setButtonText(this.plugin.t("import")).onClick(()=>new ImportConfigModal(this.app,this.plugin,()=>this.display()).open()));
    new Setting(general).setName(this.plugin.t("export")).setDesc(this.plugin.t("transferDesc")).addButton(b=>b.setButtonText(this.plugin.t("export")).onClick(async()=>{const value=this.plugin.exportString();try{await navigator.clipboard.writeText(value);new Notice(this.plugin.t("copied"));}catch(error){console.error("Space Command Palette export failed",error);new Notice(this.plugin.t("badImport"));}}));
    const editor=this.createGroup(containerEl,this.plugin.t("editor"));
    new Setting(editor).setDesc(this.plugin.t("editorDesc")).setClass("scp-group-note");
    if(!this.plugin.settings.bindings.length)new Setting(editor).setDesc(this.plugin.t("noBindings")).setClass("scp-empty-bindings");
    this.plugin.settings.bindings.forEach(binding=>this.renderBinding(editor,binding));
    new Setting(editor).addButton(b=>b.setButtonText(this.plugin.t("add")).setCta().onClick(()=>this.addBinding()));
    this.renderAuthorCard(containerEl);
  }
  authorText(){return AUTHOR_TEXT[this.plugin.settings.language]||AUTHOR_TEXT.en;}
  createGroup(parent,title){const group=parent.createDiv({cls:"setting-group scp-settings-group"});if(title)new Setting(group).setName(title).setHeading();return group.createDiv({cls:"setting-items"});}
  renderAuthorCard(parent){
    const text=this.authorText(),card=parent.createDiv({cls:"scp-author-card"});
    const top=card.createDiv({cls:"scp-author-top"});
    const avatarSrc="data:image/jpeg;base64,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";
    top.createEl("img",{cls:"scp-author-avatar",attr:{src:avatarSrc,alt:"oxill"}});
    const copy=top.createDiv({cls:"scp-author-copy"});copy.createEl("h3",{text:text.title});copy.createEl("p",{text:text.body});
    const links=card.createDiv({cls:"scp-social-links"});
    this.socialButton(links,"telegram","Telegram","https://t.me/oxilldat","<svg viewBox='0 0 24 24'><path d='M21.7 3.4 18.5 19c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9-8.1c.4-.4-.1-.6-.6-.2L6.1 12.8 1.3 11.3c-1-.3-1-1 .2-1.5L20.3 2.6c.9-.3 1.7.2 1.4.8Z'/></svg>");
    this.socialButton(links,"boosty","Boosty","https://boosty.to/oxilldat","<svg viewBox='0 0 24 24'><path d='m13.1 2-3.8 7.4 2.5.1-3.7 6.7 3.4.1L9.7 22c5.5-1.8 9-5.2 9-9.2 0-2.8-1.8-4.8-4.5-5.5L16.6 2h-3.5Zm-.8 17.1 1.2-4.4-2.6-.1 3.4-6.2c1.6.5 2.6 1.8 2.6 3.7 0 2.7-1.7 5-4.6 7Z'/></svg>");
    this.socialButton(links,"youtube","YouTube","https://www.youtube.com/@oxilldat","<svg viewBox='0 0 24 24'><path d='M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z'/></svg>");
  }
  socialButton(parent,brand,label,url,icon){const link=parent.createEl("a",{cls:`scp-social-button is-${brand}`,attr:{href:url,target:"_blank",rel:"noopener noreferrer","aria-label":label,title:label}});const mark=link.createSpan({cls:"scp-social-icon"});mark.innerHTML=icon;}
  availableNames(current=null){const used=new Set(this.plugin.settings.bindings.map(b=>b.workspaceName));return this.plugin.getWorkspaceNames().filter(name=>name!==current&&!used.has(name));}
  renderBinding(containerEl,binding){
    const exists=this.plugin.getWorkspaceNames().includes(binding.workspaceName);
    const setting=new Setting(containerEl);
    setting.settingEl.addClass("space-binding-row");if(!exists)setting.settingEl.addClass("is-missing");
    setting.addDropdown(d=>{if(binding.workspaceName&&!exists)d.addOption(binding.workspaceName,`⚠ ${binding.workspaceName}`);if(exists)d.addOption(binding.workspaceName,binding.workspaceName);for(const name of this.availableNames(binding.workspaceName))d.addOption(name,name);d.setValue(binding.workspaceName).onChange(async value=>{if(!value)return;binding.workspaceName=value;await this.plugin.saveSettings();this.plugin.syncWorkspace(true);this.display();});});
    setting.addButton(b=>b.setButtonText(this.plugin.t("chooseCommands")).onClick(()=>new CommandPickerModal(this.app,this.plugin,binding,()=>this.display()).open()));
    setting.addButton(b=>b.setButtonText(this.plugin.t("pinned")).onClick(()=>new PinnedCommandsModal(this.app,this.plugin,binding,()=>this.display()).open()));
    setting.addExtraButton(b=>b.setIcon("trash-2").setTooltip(this.plugin.t("remove")).onClick(async()=>{this.plugin.settings.bindings=this.plugin.settings.bindings.filter(item=>item!==binding);await this.plugin.saveSettings();this.display();}));
  }
  async addBinding(){const names=this.availableNames();if(!names.length)return new Notice(this.plugin.t("noAvailable"));this.plugin.settings.bindings.push({workspaceName:names[0],commands:[]});await this.plugin.saveSettings();this.display();}
}

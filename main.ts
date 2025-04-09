import { Plugin, PluginSettingTab, App, Setting } from "obsidian";

// Settings interface and defaults
interface HideFolderPrefixSettings {
  delimiter: string;
}

const DEFAULT_SETTINGS: HideFolderPrefixSettings = {
  delimiter: "_",
};

export default class HideFolderPrefixPlugin extends Plugin {
  settings: HideFolderPrefixSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new HideFolderPrefixSettingTab(this.app, this));

    this.injectCSS();
    this.updateFolderNames();
    this.observeExplorer();
  }

  onunload() {
    this.removeCSS();
    this.clearCleanNames();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateFolderNames(); // Refresh folder names on settings change
  }

  injectCSS() {
    this.removeCSS();
    const style = document.createElement("style");
    style.id = "hide-folder-prefix-style";
    style.textContent = `
      .nav-folder-title-content[data-clean-name] {
        color: transparent;
        position: relative;
      }

      .nav-folder-title-content[data-clean-name]::before {
        content: attr(data-clean-name);
        position: absolute;
        left: 0;
        color: var(--text-normal);
        white-space: pre;
      }
    `;
    document.head.appendChild(style);
  }

  removeCSS() {
    const existing = document.getElementById("hide-folder-prefix-style");
    if (existing) existing.remove();
  }

  observeExplorer() {
    const explorer = document.querySelector(".workspace");
    if (!explorer) return;

    const observer = new MutationObserver(() => this.updateFolderNames());
    observer.observe(explorer, { childList: true, subtree: true });
  }

  updateFolderNames() {
    const folders = document.querySelectorAll(".nav-folder-title-content");
    const { delimiter } = this.settings;

    folders.forEach((el) => {
      const fullName = el.textContent ?? "";
      let cleaned: string | null = null;

      if (/^\d/.test(fullName) && delimiter && fullName.includes(delimiter)) {
        const parts = fullName.split(delimiter);
        if (parts.length > 1) {
          cleaned = parts.slice(1).join(delimiter);
        }
      }

      if (cleaned) {
        el.setAttribute("data-clean-name", cleaned);
      } else {
        el.removeAttribute("data-clean-name");
      }
    });
  }

  clearCleanNames() {
    const folders = document.querySelectorAll(".nav-folder-title-content");
    folders.forEach((el) => el.removeAttribute("data-clean-name"));
  }
}

class HideFolderPrefixSettingTab extends PluginSettingTab {
  plugin: HideFolderPrefixPlugin;

  constructor(app: App, plugin: HideFolderPrefixPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Hide Folder Prefix Settings" });

    new Setting(containerEl)
      .setName("Delimiter")
      .setDesc("Hide everything before and including this delimiter (e.g., '_', '-', or '::')")
      .addText((text) =>
        text
          .setPlaceholder("_")
          .setValue(this.plugin.settings.delimiter)
          .onChange(async (value) => {
            this.plugin.settings.delimiter = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

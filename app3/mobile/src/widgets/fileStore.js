/**
 * App Group file adapter. `dir` is the expo-widgets `widgetsDirectory` (file://).
 */
export class FileAppGroupStore {
  constructor(dir) {
    this.dir = String(dir || '').replace(/\/?$/, '/');
  }

  path(name) {
    return `${this.dir}${name}`;
  }

  fs() {
    return require('expo-file-system');
  }

  async readJson(name) {
    try {
      const FileSystem = this.fs();
      const raw = await FileSystem.readAsStringAsync(this.path(name));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async writeJson(name, value) {
    const FileSystem = this.fs();
    await FileSystem.writeAsStringAsync(this.path(name), JSON.stringify(value));
  }
}

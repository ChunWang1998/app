import AsyncStorage from '@react-native-async-storage/async-storage';

export class KeyValueStorage {
  /**
   * @param {{ namespace?: string }} options
   */
  constructor(options = {}) {
    this.namespace = options.namespace || 'decibelmeter';
  }
  key(k) {
    return `${this.namespace}:${k}`;
  }
  async getItem(key) {
    return AsyncStorage.getItem(this.key(key));
  }
  async setItem(key, value) {
    return AsyncStorage.setItem(this.key(key), value);
  }
  async removeItem(key) {
    return AsyncStorage.removeItem(this.key(key));
  }
}

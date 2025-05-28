type Entry<K, V> = [K, V];

export class SortedMap<K extends string | number | symbol, V> {
  private entries: Entry<K, V>[] = [];

  // 
  set(key: K, value: V): this {
    const index = this.entries.findIndex(([k]) => k === key);
    if (index !== -1) {
      this.entries[index][1] = value;
    } else {
      this.entries.push([key, value]);
      this.entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    }
    return this;
  }

  // 
  get(key: K): V | undefined {
    return this.entries.find(([k]) => k === key)?.[1];
  }

  // 
  forEach(callbackfn: (value: V, key: K, map: SortedMap<K, V>) => void, thisArg?: any): void {
    this.entries.forEach(([key, value]) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }
}
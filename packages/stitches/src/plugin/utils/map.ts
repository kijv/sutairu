/*
MIT License

Copyright (c) 2021-PRESENT Anthony Fu <https://github.com/antfu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export class TwoKeyMap<K1, K2, V> {
	_map = new Map<K1, Map<K2, V>>();

	get(key1: K1, key2: K2): V | undefined {
		const m2 = this._map.get(key1);
		if (m2) return m2.get(key2);
	}

	getFallback(key1: K1, key2: K2, fallback: V): V {
		let m2 = this._map.get(key1);
		if (!m2) {
			m2 = new Map<K2, V>();
			this._map.set(key1, m2);
		}
		if (!m2.has(key2)) m2.set(key2, fallback);
		return m2.get(key2)!;
	}

	set(key1: K1, key2: K2, value: V) {
		let m2 = this._map.get(key1);
		if (!m2) {
			m2 = new Map();
			this._map.set(key1, m2);
		}
		m2.set(key2, value);
		return this;
	}

	has(key1: K1, key2: K2) {
		return this._map.get(key1)?.has(key2);
	}

	delete(key1: K1, key2: K2) {
		return this._map.get(key1)?.delete(key2) || false;
	}

	deleteTop(key1: K1) {
		return this._map.delete(key1);
	}

	map<T>(fn: (v: V, k1: K1, k2: K2) => T): T[] {
		return Array.from(this._map.entries()).flatMap(([k1, m2]) =>
			Array.from(m2.entries()).map(([k2, v]) => {
				return fn(v, k1, k2);
			}),
		);
	}
}

export class BetterMap<K, V> extends Map<K, V> {
	map<R>(mapFn: (value: V, key: K) => R): R[] {
		const result: R[] = [];
		for (const [k, v] of this) {
			result.push(mapFn(v, k));
		}
		return result;
	}
}

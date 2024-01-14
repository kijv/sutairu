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

// port from https://github.com/ai/nanoevents

type EventsMap = Record<string, any>;

interface DefaultEvents extends EventsMap {
	[event: string]: (...args: any) => void;
}

export interface Unsubscribe {
	(): void;
}

export declare class Emitter<Events extends EventsMap = DefaultEvents> {
	/**
	 * Event names in keys and arrays with listeners in values.
	 *
	 * ```js
	 * emitter1.events = emitter2.events
	 * emitter2.events = { }
	 * ```
	 */
	events: Partial<{ [E in keyof Events]: Events[E][] }>;

	/**
	 * Add a listener for a given event.
	 *
	 * ```js
	 * const unbind = ee.on('tick', (tickType, tickDuration) => {
	 *   count += 1
	 * })
	 *
	 * disable () {
	 *   unbind()
	 * }
	 * ```
	 *
	 * @param event The event name.
	 * @param cb The listener function.
	 * @returns Unbind listener from event.
	 */
	on<K extends keyof Events>(this: this, event: K, cb: Events[K]): Unsubscribe;

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * ```js
	 * ee.emit('tick', tickType, tickDuration)
	 * ```
	 *
	 * @param event The event name.
	 * @param args The arguments for listeners.
	 */
	emit<K extends keyof Events>(
		this: this,
		event: K,
		...args: Parameters<Events[K]>
	): void;
}

/**
 * Create event emitter.
 *
 * ```js
 * import { createNanoEvents } from 'nanoevents'
 *
 * class Ticker {
 *   constructor() {
 *     this.emitter = createNanoEvents()
 *   }
 *   on(...args) {
 *     return this.emitter.on(...args)
 *   }
 *   tick() {
 *     this.emitter.emit('tick')
 *   }
 * }
 * ```
 */
export function createNanoEvents<
	Events extends EventsMap = DefaultEvents,
>(): Emitter<Events> {
	return {
		events: {},
		emit(event, ...args) {
			for (const i of this.events[event] || []) {
				i(...args);
			}
		},
		on(event, cb) {
			// biome-ignore lint/suspicious/noAssignInExpressions:
			(this.events[event] = this.events[event] || ([] as any)).push(cb);
			return () =>
				// biome-ignore lint/suspicious/noAssignInExpressions:
				(this.events[event] = (this.events[event] || ([] as any)).filter(
					(i: any) => i !== cb,
				));
		},
	};
}

import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";

export interface Kept<Value> {
	now(): Value;
	change(value: Value, reason: string): void;
	watch(listener: () => void): () => void;
}

export function memoryKept<Value>(first: Value): Kept<Value> {
	let held = first;
	const listeners = new Set<() => void>();
	return {
		now: () => held,
		change: (value) => {
			held = value;
			listeners.forEach((listener) => listener());
		},
		watch: (listener) => {
			listeners.add(listener);
			return () => void listeners.delete(listener);
		},
	};
}

export interface DocShape<Doc, Value> {
	readonly read: (doc: Doc) => Value;
	readonly write: (value: Value) => Partial<Doc>;
}

export function heldKept<Doc extends object, Value>(doc: HeldDoc<Doc>, shape: DocShape<Doc, Value>): Kept<Value> {
	return {
		now: () => shape.read(doc.now()),
		change: (value, reason) => {
			doc.change(shape.write(value), reason);
			void doc.flush();
		},
		watch: (listener) => doc.watch(listener),
	};
}

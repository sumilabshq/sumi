import type { CatalogueEntry } from "../host/registry.host.js";

export type Switches = Readonly<Record<string, boolean>>;

export function isOn(entry: CatalogueEntry, switches: Switches): boolean {
	return entry.alwaysOn || (switches[entry.id] ?? true);
}

export function dependentsOff(catalogue: readonly CatalogueEntry[], switches: Switches, id: string): readonly string[] {
	const off = new Set<string>([id]);
	let grew = true;

	while (grew) {
		grew = false;

		for (const entry of catalogue) {
			if (!off.has(entry.id) && isOn(entry, switches) && entry.requires.some((required) => off.has(required))) {
				off.add(entry.id);
				grew = true;
			}
		}
	}

	off.delete(id);
	return [...off];
}

export function requirementsOn(
	catalogue: readonly CatalogueEntry[],
	switches: Switches,
	id: string,
): readonly string[] {
	const on = new Set<string>();
	const pending = [id];

	for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
		const entry = catalogue.find((one) => one.id === next);

		for (const required of entry?.requires ?? []) {
			const requiredEntry = catalogue.find((one) => one.id === required);

			if (requiredEntry !== undefined && !on.has(required) && !isOn(requiredEntry, switches)) {
				on.add(required);
				pending.push(required);
			}
		}
	}

	return [...on];
}

import { RegistryFileSchema } from "../schema/registry.schema.js";
import type { AppRegistry, RegistryRow } from "../schema/registry.schema.js";

const UNREADABLE = "registry.json does not list apps as { id, source }: {issues}";
const LISTED_TWICE = 'registry.json lists "{id}" more than once; the first row is used';

export function parseRegistry(raw: unknown): AppRegistry {
	const read = RegistryFileSchema.safeParse(raw);

	if (!read.success) {
		return {
			apps: [],
			problem: UNREADABLE.replace("{issues}", read.error.issues.map((issue) => issue.message).join("; ")),
		};
	}

	const rows = read.data.apps;
	const isFirstOfId = (row: RegistryRow, at: number): boolean => rows.findIndex((one) => one.id === row.id) === at;
	const duplicateRow = rows.find((row, at) => !isFirstOfId(row, at));
	return {
		apps: rows.filter(isFirstOfId),
		problem: duplicateRow === undefined ? null : LISTED_TWICE.replace("{id}", duplicateRow.id),
	};
}

export function findRegistryRow(registry: AppRegistry, id: string): RegistryRow | null {
	return registry.apps.find((row) => row.id === id) ?? null;
}

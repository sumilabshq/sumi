import { z } from "zod";
import type { ZodType } from "zod";

export function validEntriesOf<Item>(item: ZodType<Item>): ZodType<Item[]> {
	return z
		.array(z.unknown())
		.catch([])
		.transform((entries) => entries.flatMap((entry) => parsedOrNone(item, entry)));
}

export function validValuesOf<Value>(value: ZodType<Value>): ZodType<Record<string, Value>> {
	return z
		.record(z.string(), z.unknown())
		.catch({})
		.transform((values) =>
			Object.fromEntries(Object.entries(values).flatMap((entry) => parsedEntryOrNone(value, entry))),
		);
}

function parsedEntryOrNone<Value>(value: ZodType<Value>, [key, held]: [string, unknown]): [string, Value][] {
	return parsedOrNone(value, held).map((parsed): [string, Value] => [key, parsed]);
}

function parsedOrNone<Item>(item: ZodType<Item>, held: unknown): Item[] {
	const parsed = item.safeParse(held);
	return parsed.success ? [parsed.data] : [];
}

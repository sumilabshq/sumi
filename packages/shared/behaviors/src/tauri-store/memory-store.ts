import type { Invoke } from "./store-invoke.js";

type Doc = Readonly<Record<string, unknown>>;

const STORE_COMMAND = "plugin:store|";
const NOT_IN_MEMORY = "the in-memory store keeps documents only, not {command}";

export function memoryStoreInvoke(): Invoke {
	const docs = new Map<string, Doc>();
	return (command, args) => {
		try {
			return Promise.resolve(answerOf(docs, command.replace(STORE_COMMAND, ""), args));
		} catch (refusal: unknown) {
			return Promise.reject(refusal);
		}
	};
}

function answerOf(docs: Map<string, Doc>, command: string, args: Readonly<Record<string, unknown>>): unknown {
	const key = `${String(args["root"])}:${String(args["path"])}`;

	if (command === "read") {
		return {
			doc: docs.get(key) ?? null,
			rev: revOf(docs.get(key)),
			quarantined: null,
		};
	}

	if (command === "replace") {
		return replaced(docs, key, args);
	}

	if (command === "take_entry") {
		return taken(docs, key, String(args["key"]));
	}

	throw {
		code: "bad-call",
		detail: NOT_IN_MEMORY.replace("{command}", command),
	};
}

function replaced(docs: Map<string, Doc>, key: string, args: Readonly<Record<string, unknown>>): unknown {
	const currentRev = revOf(docs.get(key));

	if (args["baseRev"] !== currentRev) {
		throw {
			code: "stale-rev",
			currentRev,
		};
	}

	docs.set(key, {
		...docOf(structuredClone(args["doc"])),
		rev: currentRev + 1,
	});
	return {
		rev: currentRev + 1,
	};
}

function taken(docs: Map<string, Doc>, key: string, entry: string): unknown {
	const { [entry]: entryTaken, ...kept } = docs.get(key) ?? {};
	const rev = revOf(docs.get(key)) + 1;
	docs.set(key, {
		...kept,
		rev,
	});
	return {
		taken: entryTaken ?? null,
		rev,
	};
}

function revOf(doc: Doc | undefined): number {
	const rev = doc?.["rev"];
	return typeof rev === "number" ? rev : 0;
}

function docOf(held: unknown): Doc {
	return typeof held === "object" && held !== null ? Object.fromEntries(Object.entries(held)) : {};
}

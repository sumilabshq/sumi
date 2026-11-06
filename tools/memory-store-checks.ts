import { z } from "zod";
import { StoreClient, StoreRefusedError, callStore, memoryStoreInvoke } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import { check, tally } from "./check-helpers.ts";

const NotesSchema = z.object({
	v: z.number(),
	notes: z.array(z.string()),
	pinned: z.string().optional(),
});

const NOTES: DocKind<z.infer<typeof NotesSchema>> = {
	file: "notes.json",
	v: 1,
	schema: NotesSchema,
};
const ROOT = "workspace:memory-store";

const invoke = memoryStoreInvoke();
const store = new StoreClient(invoke);

const empty = await store.readDoc(ROOT, NOTES);
check("a document never written reads as none at revision 0", [empty.doc, empty.rev], [null, 0]);

const first = await store.replaceDoc(ROOT, NOTES, {
	doc: {
		v: 1,
		notes: ["one"],
		pinned: "one",
	},
	baseRev: 0,
	reason: "first note",
});
const read = await store.readDoc(ROOT, NOTES);
check(
	"a replace on the current revision keeps the document and moves the revision on",
	[first, read.doc?.notes, read.rev],
	[{ ok: true, rev: 1 }, ["one"], 1],
);

const stale = await store.replaceDoc(ROOT, NOTES, {
	doc: {
		v: 1,
		notes: ["lost"],
	},
	baseRev: 0,
	reason: "stale write",
});
check(
	"a replace on an old revision is refused and keeps what was there",
	[stale, (await store.readDoc(ROOT, NOTES)).doc?.notes],
	[{ ok: false, currentRev: 1 }, ["one"]],
);

const pinned = await store.takeEntry(ROOT, NOTES, "pinned", "unpin");
const afterTake = await store.readDoc(ROOT, NOTES);
check(
	"taking an entry answers it and leaves the rest at a new revision",
	[pinned, afterTake.doc?.pinned, afterTake.doc?.notes, afterTake.rev],
	["one", undefined, ["one"], 2],
);

const other = await new StoreClient(memoryStoreInvoke()).readDoc(ROOT, NOTES);
check("each memory store keeps its own documents", other.doc, null);

const refused = await callStore(invoke, "append", { root: ROOT, path: "log.jsonl", line: { id: "a" } }).then(
	() => "kept",
	(failure: unknown) => (failure instanceof StoreRefusedError ? failure.refusal.code : "thrown"),
);
check("a call the memory store does not keep is refused, never dropped", refused, "bad-call");

console.log(tally.failed ? `memory store: ${tally.failed} check(s) failed` : "memory store: all checks passed");
process.exit(tally.failed ? 1 : 0);

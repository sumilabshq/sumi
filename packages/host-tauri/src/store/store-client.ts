import { z } from "zod";
import type { ZodType } from "zod";
import { StoreRefusedError, callStore } from "./store-invoke.js";
import type { Invoke } from "./store-invoke.js";

export type WorkspaceRoot = `workspace:${string}`;

export type FolderRoot = `folder:${string}`;

export type StoreRoot = "global" | WorkspaceRoot | FolderRoot;

export const GLOBAL_ROOT: StoreRoot = "global";

export interface DocKind<Doc> {
	readonly file: string;
	readonly v: number;
	readonly schema: ZodType<Doc>;
	readonly salvage?: ZodType<Doc>;
}

export interface DocState<Doc> {
	readonly doc: Doc | null;
	readonly rev: number;
	readonly isReadOnly: boolean;
	readonly quarantined: string | null;
}

export type Replaced =
	| {
			readonly ok: true;
			readonly rev: number;
	  }
	| {
			readonly ok: false;
			readonly currentRev: number;
	  };

export interface LinesAsk<Line> {
	readonly file: string;
	readonly schema: ZodType<Line>;
	readonly before: number | null;
	readonly limit: number;
}

export interface LinesPage<Line> {
	readonly lines: readonly Line[];
	readonly cursor: number;
	readonly hasEarlier: boolean;
	readonly tornTail: boolean;
}

const DocReadSchema = z.object({
	doc: z.record(z.string(), z.unknown()).nullable(),
	rev: z.number().int().nonnegative(),
	quarantined: z.string().nullable(),
});

const ReplacedSchema = z.object({
	rev: z.number().int().positive(),
});

const LinesReadSchema = z.object({
	lines: z.array(z.unknown()),
	cursor: z.number().int().nonnegative(),
	hasEarlier: z.boolean(),
	tornTail: z.boolean(),
});

const VersionSchema = z.object({
	v: z.number().int().positive(),
});

type DocRead<Doc> = Pick<DocState<Doc>, "doc" | "isReadOnly">;

const NOTHING_READ: DocRead<never> = {
	doc: null,
	isReadOnly: false,
};

export function workspaceRootOf(id: string): WorkspaceRoot {
	return `workspace:${id}`;
}

export function folderRootOf(id: string): FolderRoot {
	return `folder:${id}`;
}

export class StoreClient {
	constructor(private readonly invoke: Invoke) {}

	async readDoc<Doc>(root: StoreRoot, kind: DocKind<Doc>): Promise<DocState<Doc>> {
		const answer = DocReadSchema.parse(await callStore(this.invoke, "read", { root, path: kind.file }));
		if (answer.quarantined !== null) {
			console.warn(`[ink] ${root}:${kind.file} was unreadable, kept aside as ${answer.quarantined}`);
		}

		return docStateOf(answer, kind, `${root}:${kind.file}`);
	}

	async replaceDoc<Doc extends object>(
		root: StoreRoot,
		kind: DocKind<Doc>,
		change: {
			readonly doc: Doc;
			readonly baseRev: number;
			readonly reason: string;
		},
	): Promise<Replaced> {
		const args = {
			root,
			path: kind.file,
			doc: {
				...change.doc,
				v: kind.v,
			},
			baseRev: change.baseRev,
			reason: change.reason,
		};
		try {
			return {
				ok: true,
				rev: ReplacedSchema.parse(await callStore(this.invoke, "replace", args)).rev,
			};
		} catch (failure: unknown) {
			return staleOrThrow(failure);
		}
	}

	async appendLine(root: StoreRoot, file: string, line: { readonly id: string }): Promise<void> {
		await callStore(this.invoke, "append", { root, path: file, line });
	}

	async readLines<Line>(root: StoreRoot, ask: LinesAsk<Line>): Promise<LinesPage<Line>> {
		const answer = LinesReadSchema.parse(
			await callStore(this.invoke, "read_lines", {
				root,
				path: ask.file,
				before: ask.before,
				limit: ask.limit,
			}),
		);
		return {
			lines: answer.lines.flatMap((line) => linesKept(ask.schema, line, `${root}:${ask.file}`)),
			cursor: answer.cursor,
			hasEarlier: answer.hasEarlier,
			tornTail: answer.tornTail,
		};
	}
}

function docStateOf<Doc>(answer: z.infer<typeof DocReadSchema>, kind: DocKind<Doc>, label: string): DocState<Doc> {
	return {
		rev: answer.rev,
		quarantined: answer.quarantined,
		...(answer.doc === null ? NOTHING_READ : parsedReadOf(kind, answer.doc, label)),
	};
}

function parsedReadOf<Doc>(kind: DocKind<Doc>, raw: Record<string, unknown>, label: string): DocRead<Doc> {
	const parsed = kind.schema.safeParse(raw);
	if (parsed.success) {
		return {
			doc: parsed.data,
			isReadOnly: isNewerThan(raw, kind.v),
		};
	}

	return {
		doc: salvagedOf(kind, { raw, label, issues: parsed.error.issues }),
		isReadOnly: true,
	};
}

interface UnmatchedDoc {
	readonly raw: unknown;
	readonly label: string;
	readonly issues: readonly z.core.$ZodIssue[];
}

function salvagedOf<Doc>(kind: DocKind<Doc>, { raw, label, issues }: UnmatchedDoc): Doc | null {
	const salvaged = kind.salvage?.safeParse(raw);
	if (salvaged === undefined || !salvaged.success) {
		console.warn(`[ink] ${label} writable → read-only: it does not match its shape`, issues);
		return null;
	}

	const dropped = issues.map((issue) => issue.path.map(String).join(".")).join(", ");
	console.warn(
		`[ink] ${label} writable → read-only: dropped ${dropped}, of another shape; the file stays as it is`,
		issues,
	);
	return salvaged.data;
}

function isNewerThan(doc: unknown, knownV: number): boolean {
	const version = VersionSchema.safeParse(doc);
	return !version.success || version.data.v > knownV;
}

function staleOrThrow(failure: unknown): Replaced {
	if (!(failure instanceof StoreRefusedError) || failure.refusal.code !== "stale-rev") {
		throw failure;
	}

	return {
		ok: false,
		currentRev: failure.refusal.currentRev ?? 0,
	};
}

function linesKept<Line>(schema: ZodType<Line>, line: unknown, label: string): Line[] {
	const parsed = schema.safeParse(line);
	if (parsed.success) {
		return [parsed.data];
	}

	console.warn(`[ink] ${label} holds a line of another shape, skipped`, parsed.error.issues);
	return [];
}

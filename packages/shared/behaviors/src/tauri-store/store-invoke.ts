import { z } from "zod";

export type Invoke = (command: string, args: Readonly<Record<string, unknown>>) => Promise<unknown>;

export type StoreCommand =
	| "read"
	| "replace"
	| "append"
	| "read_lines"
	| "take_entry"
	| "open_first_workspace"
	| "create_workspace"
	| "attach_workspace_folder"
	| "mark_workspace_opened"
	| "choose_workspace_folder"
	| "list_workspaces"
	| "rename_workspace";

const STORE_PLUGIN = "store";

const StoreRefusalSchema = z.object({
	code: z.enum([
		"bad-root",
		"bad-path",
		"symlink",
		"reserved",
		"no-workspace",
		"no-folder",
		"folder-not-found",
		"stale-rev",
		"newer-version",
		"bad-doc",
		"bad-line",
		"bad-call",
		"io",
	]),
	detail: z.string().optional(),
	currentRev: z.number().int().nonnegative().optional(),
	onDiskV: z.number().int().positive().optional(),
});

export type StoreRefusal = z.infer<typeof StoreRefusalSchema>;

export class StoreRefusedError extends Error {
	constructor(readonly refusal: StoreRefusal) {
		super(`the store refused (${refusal.code})${refusal.detail === undefined ? "" : `: ${refusal.detail}`}`);
	}
}

export async function callStore(
	invoke: Invoke,
	command: StoreCommand,
	args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
	try {
		return await invoke(`plugin:${STORE_PLUGIN}|${command}`, args);
	} catch (failure: unknown) {
		const refusal = StoreRefusalSchema.safeParse(failure);
		throw refusal.success ? new StoreRefusedError(refusal.data) : failure;
	}
}

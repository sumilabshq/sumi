import { z } from "zod";

export const DeskVerbSchema = z.enum(["read", "shot", "open"]);

export type DeskVerb = z.infer<typeof DeskVerbSchema>;

export const DeskAskSchema = z.object({
	token: z.string().default(""),
	verb: DeskVerbSchema,
	url: z.string().optional(),
	region: z
		.object({
			x: z.number().int().min(0),
			y: z.number().int().min(0),
			width: z.number().int().min(1),
			height: z.number().int().min(1),
		})
		.nullable()
		.optional(),
});

export type DeskAsk = z.infer<typeof DeskAskSchema>;

export const DeskAnswerSchema = z.union([
	z.object({
		ok: z.literal(true),
		output: z.unknown(),
	}),
	z.object({
		ok: z.literal(false),
		reason: z.string(),
	}),
]);

export type DeskAnswer = z.infer<typeof DeskAnswerSchema>;

export interface DeskFolders {
	readonly root: string;
	readonly desk: string;
	readonly asks: string;
	readonly answers: string;
	readonly shots: string;
	readonly token: string;
}

export interface DeskPlace {
	readonly platform: string;
	readonly runtimeDir: string | undefined;
	readonly tempDir: string;
	readonly homeDir: string;
}

export interface OsFolders {
	tmpdir(): string;
	homedir(): string;
}

export const DESK_WAIT_MS = 150_000;
export const DESK_KEEPS_MS = 10 * 60 * 1000;

const DESK_FOLDER = "widgetarium-browser";
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function deskPlaceOfProcess(os: OsFolders): DeskPlace {
	return {
		platform: process.platform,
		runtimeDir: process.env["XDG_RUNTIME_DIR"],
		tempDir: os.tmpdir(),
		homeDir: os.homedir(),
	};
}

export function deskRootOf(place: DeskPlace): string {
	if (place.platform !== "linux") {
		return `${place.tempDir}/${DESK_FOLDER}`;
	}

	return place.runtimeDir ? `${place.runtimeDir}/${DESK_FOLDER}` : `${place.homeDir}/.cache/${DESK_FOLDER}`;
}

export function deskFoldersOf(root: string, vaultRealPath: string): DeskFolders {
	const desk = `${root}/${hashOf(vaultRealPath)}`;

	return {
		root,
		desk,
		asks: `${desk}/asks`,
		answers: `${desk}/answers`,
		shots: `${desk}/shots`,
		token: `${desk}/token`,
	};
}

export function foldersToMake(folders: DeskFolders): readonly string[] {
	return [folders.root, folders.desk, folders.asks, folders.answers, folders.shots];
}

function hashOf(text: string): string {
	let hash = FNV_OFFSET;

	for (const character of text) {
		hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), FNV_PRIME) >>> 0;
	}

	return hash.toString(16).padStart(8, "0");
}

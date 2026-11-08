import fs from "node:fs";
import path from "node:path";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { CliRefusal } from "./cli-output.js";

export interface FileWrite {
	readonly file: string;
	readonly text: string | null;
	readonly scanned?: string;
}

const CHANGED_SINCE_SCAN = "{file} changed since rename read it; run it again";
const STAGED_SUFFIX = ".rename-staged";

export class FileTransaction {
	private readonly originals = new Map<string, string | null>();

	constructor(private readonly root: string) {}

	commit(writes: readonly FileWrite[]): void {
		const real = writes.map((write) => ({ ...write, file: realFileOf(write.file) }));
		real.forEach((write) => this.keepOriginal(write));
		const staged = stagedWrites(real);

		try {
			staged.forEach(swapIn);
		} finally {
			removeStagings(staged);
		}
	}

	rollbackFailures(): string[] {
		return [...this.originals].flatMap(([file, original]) => {
			try {
				restore(file, original);
				return [];
			} catch (failure) {
				return [`${path.relative(this.root, file)}: ${reasonOf(failure)}`];
			}
		});
	}

	private keepOriginal({ file, scanned }: FileWrite): void {
		const current = textOf(file);

		if (scanned !== undefined && current !== scanned) {
			throw new CliRefusal(fillTemplate(CHANGED_SINCE_SCAN, { file: path.relative(this.root, file) }));
		}

		if (!this.originals.has(file)) {
			this.originals.set(file, current);
		}
	}
}

export function reasonOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

interface StagedWrite extends FileWrite {
	readonly staging: string;
}

function realFileOf(file: string): string {
	return fs.existsSync(file) ? fs.realpathSync(file) : file;
}

function stagedWrites(writes: readonly FileWrite[]): StagedWrite[] {
	const staged: StagedWrite[] = [];

	try {
		for (const write of writes) {
			staged.push(stageOf(write));
		}
	} catch (failure) {
		removeStagings(staged);
		throw failure;
	}

	return staged;
}

function stageOf({ file, text }: FileWrite): StagedWrite {
	const staging = `${file}${STAGED_SUFFIX}`;

	if (text !== null) {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(staging, text);
		keepMode(file, staging);
	}

	return {
		file,
		text,
		staging,
	};
}

function keepMode(file: string, staging: string): void {
	if (fs.existsSync(file)) {
		fs.chmodSync(staging, fs.statSync(file).mode);
	}
}

function swapIn({ file, text, staging }: StagedWrite): void {
	if (text === null) {
		removeIfThere(file);
		return;
	}

	fs.renameSync(staging, file);
}

function removeStagings(staged: readonly StagedWrite[]): void {
	staged.forEach(({ staging }) => removeIfThere(staging));
}

function removeIfThere(file: string): void {
	if (fs.existsSync(file)) {
		fs.rmSync(file);
	}
}

function restore(file: string, original: string | null): void {
	if (original === null) {
		removeIfThere(file);
		return;
	}

	if (textOf(file) !== original) {
		fs.writeFileSync(file, original);
	}
}

function textOf(file: string): string | null {
	return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

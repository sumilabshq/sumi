type NodeFs = typeof import("node:fs");

const PRIVATE_FOLDER = 0o700;
const PRIVATE_FILE = 0o600;
const OPEN_TO_OTHERS = 0o077;
const RANDOM_BYTES = 16;
const NOT_PRIVATE = "{path} is not a private {kind} of this user";

export class PrivateFiles {
	private readonly createFlags: number;
	private readonly readFlags: number;

	constructor(
		private readonly fs: NodeFs,
		private readonly uid: number | null,
	) {
		const { O_CREAT, O_EXCL, O_WRONLY, O_RDONLY, O_NOFOLLOW = 0 } = fs.constants;
		this.createFlags = O_CREAT | O_EXCL | O_WRONLY | O_NOFOLLOW;
		this.readFlags = O_RDONLY | O_NOFOLLOW;
	}

	makeFolders(folders: readonly string[]): void {
		for (const folder of folders) {
			this.fs.mkdirSync(folder, {
				recursive: true,
				mode: PRIVATE_FOLDER,
			});
			this.refuseUnlessPrivate(folder, "folder");
		}
	}

	write(path: string, data: string | Uint8Array): void {
		const part = `${path}.${randomHex()}.part`;
		const descriptor = this.fs.openSync(part, this.createFlags, PRIVATE_FILE);

		try {
			this.fs.writeFileSync(descriptor, data);
		} finally {
			this.fs.closeSync(descriptor);
		}

		this.fs.renameSync(part, path);
	}

	read(path: string): string {
		this.refuseUnlessPrivate(path, "file");
		const descriptor = this.fs.openSync(path, this.readFlags);

		try {
			return this.fs.readFileSync(descriptor, "utf8");
		} finally {
			this.fs.closeSync(descriptor);
		}
	}

	exists(path: string): boolean {
		return this.fs.existsSync(path);
	}

	remove(path: string): void {
		this.fs.rmSync(path, { force: true });
	}

	removeOlderThan(folder: string, ageMs: number, now: number): void {
		for (const name of this.fs.readdirSync(folder)) {
			const path = `${folder}/${name}`;

			if (this.fs.lstatSync(path).mtimeMs < now - ageMs) {
				this.fs.rmSync(path, { force: true });
			}
		}
	}

	private refuseUnlessPrivate(path: string, kind: "folder" | "file"): void {
		const entry = this.fs.lstatSync(path);
		const isKind = kind === "folder" ? entry.isDirectory() : entry.isFile();
		// TRADE-OFF: Windows has no uid or mode bits, so only the link check holds there
		const isOwned = this.uid === null || (entry.uid === this.uid && (entry.mode & OPEN_TO_OTHERS) === 0);

		if (entry.isSymbolicLink() || !isKind || !isOwned) {
			throw new Error(NOT_PRIVATE.replace("{path}", path).replace("{kind}", kind));
		}
	}
}

function randomHex(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

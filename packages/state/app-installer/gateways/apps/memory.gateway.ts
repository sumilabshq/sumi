import type { AppManifest } from "@sumi/contract";
import type { AppVersion, VersionMove, VersionsRow } from "../../shared/schema/installed.schema.js";
import type { AppRegistry } from "../../shared/schema/registry.schema.js";
import type { AppFileUrlOf } from "../../shared/lib/app-file-url.js";
import { AppInstallerRefusedError } from "../../shared/lib/installer-refusal.js";
import { parseRegistry } from "../../shared/lib/registry-read.js";
import { parseManifest } from "../../shared/lib/release-gate.js";
import { AppsGateway } from "./apps.gateway.js";
import type { InstallAsk, InstalledRows, ReleaseRead } from "./apps.gateway.js";

export interface HeldApps {
	readonly registry: unknown;
	readonly folders: Readonly<Record<string, ReleaseRead>>;
	readonly fileUrlOf: AppFileUrlOf;
}

interface Row {
	readonly current: string | null;
	readonly previous: string | null;
	readonly failed: readonly string[];
}

const NO_ROW: Row = {
	current: null,
	previous: null,
	failed: [],
};

export class MemoryAppsGateway extends AppsGateway {
	private held: HeldApps;
	private rows: Readonly<Record<string, Row>> = {};
	private manifests: Readonly<Record<string, unknown>> = {};

	constructor(held: HeldApps) {
		super();
		this.held = held;
	}

	placeFolder(path: string, read: ReleaseRead): void {
		this.held = {
			...this.held,
			folders: {
				...this.held.folders,
				[path]: read,
			},
		};
	}

	override readRegistry(): Promise<AppRegistry> {
		return Promise.resolve(parseRegistry(this.held.registry));
	}

	override readInstalled(): Promise<InstalledRows> {
		const ids = Object.keys(this.rows);
		return Promise.resolve(Object.fromEntries(ids.map((id) => [id, this.answerOf(id)])));
	}

	override readManifest({ id, version }: AppVersion): Promise<AppManifest> {
		const manifest = this.manifests[keyOf(id, version)];

		if (manifest === undefined) {
			return notInstalledOf(id, version);
		}

		const read = parseManifest(manifest);
		return read.ok ? Promise.resolve(read.manifest) : Promise.reject(new Error(read.reason));
	}

	override readRelease(path: string): Promise<ReleaseRead> {
		const read = this.held.folders[path];
		return read === undefined
			? Promise.reject(new AppInstallerRefusedError(`${path} holds no release`))
			: Promise.resolve(read);
	}

	override fileUrlOf(installed: AppVersion, file: string): string {
		return this.held.fileUrlOf(installed, file);
	}

	override async install({ id, path, manifestSha256 }: InstallAsk): Promise<AppVersion> {
		const { manifest, release, manifestSha256: laidSha256 } = await this.readRelease(path);
		const version = textIn(manifest, "version");
		const refusal = mismatchOf(id, manifest, release) ?? changedSince(manifestSha256, laidSha256);

		if (refusal !== null) {
			throw new AppInstallerRefusedError(refusal);
		}

		this.keepInstalled({ id, version }, manifest);
		return {
			id,
			version,
		};
	}

	override switchTo({ id, version }: AppVersion): Promise<VersionMove> {
		const row = this.rows[id] ?? NO_ROW;

		if (!this.isInstalled(id, version)) {
			return notInstalledOf(id, version);
		}

		if (row.failed.includes(version)) {
			return Promise.reject(new AppInstallerRefusedError(`${version} failed before and cannot be made current`));
		}

		return Promise.resolve(this.moved(id, switchedRowOf(row, version)));
	}

	override markFailed({ id, version }: AppVersion): Promise<VersionMove> {
		const row = this.rows[id] ?? NO_ROW;

		if (!this.isInstalled(id, version)) {
			return notInstalledOf(id, version);
		}

		return Promise.resolve(this.moved(id, failedRowOf(row, version)));
	}

	override retry({ id, version }: AppVersion): Promise<VersionMove> {
		const row = this.rows[id] ?? NO_ROW;

		if (!this.isInstalled(id, version)) {
			return notInstalledOf(id, version);
		}

		return Promise.resolve(
			this.moved(id, {
				current: row.current ?? version,
				previous: row.previous,
				failed: row.failed.filter((one) => one !== version),
			}),
		);
	}

	private keepInstalled({ id, version }: AppVersion, manifest: unknown): void {
		this.manifests = {
			...this.manifests,
			[keyOf(id, version)]: manifest,
		};
		this.rows = {
			...this.rows,
			[id]: installedRowOf(this.rows[id] ?? NO_ROW, version),
		};
	}

	private moved(id: string, next: Row): VersionMove {
		const was = this.answerOf(id);
		this.rows = {
			...this.rows,
			[id]: next,
		};
		return {
			was,
			now: this.answerOf(id),
		};
	}

	private isInstalled(id: string, version: string): boolean {
		return this.manifests[keyOf(id, version)] !== undefined;
	}

	private answerOf(id: string): VersionsRow {
		const row = this.rows[id] ?? NO_ROW;
		const prefix = keyOf(id, "");
		return {
			current: row.current,
			previous: row.previous,
			failed: [...row.failed],
			versions: Object.keys(this.manifests)
				.filter((key) => key.startsWith(prefix))
				.map((key) => key.slice(prefix.length))
				.sort(),
		};
	}
}

function keyOf(id: string, version: string): string {
	return [id, version].join("/");
}

function textIn(doc: unknown, field: string): string {
	if (typeof doc !== "object" || doc === null || !(field in doc)) {
		return "";
	}

	const value: unknown = Reflect.get(doc, field);
	return typeof value === "string" ? value : "";
}

function mismatchOf(id: string, manifest: unknown, release: ReleaseRead["release"]): string | null {
	const named = [id, textIn(manifest, "id"), release.app];

	if (new Set(named).size !== 1) {
		return `the app id does not match: ${named.join(", ")}`;
	}

	if (textIn(manifest, "version") !== release.version) {
		return `the version does not match: ${textIn(manifest, "version")}, ${release.version}`;
	}

	return null;
}

function changedSince(inspectedSha256: string, laidSha256: string): string | null {
	return inspectedSha256 === laidSha256 ? null : "sumi-app.json changed since it was inspected";
}

function notInstalledOf(id: string, version: string): Promise<never> {
	return Promise.reject(new AppInstallerRefusedError(`${id} ${version} is not installed`));
}

function installedRowOf(row: Row, version: string): Row {
	if (row.current !== null || row.failed.includes(version)) {
		return row;
	}

	return {
		...row,
		current: version,
	};
}

function switchedRowOf(row: Row, version: string): Row {
	if (row.current === version) {
		return row;
	}

	return {
		current: version,
		previous: row.current,
		failed: row.failed,
	};
}

function failedRowOf(row: Row, version: string): Row {
	const failed = row.failed.includes(version) ? row.failed : [...row.failed, version];
	const previous = row.previous === version ? null : row.previous;
	const wasCurrent = row.current === version;
	return {
		current: wasCurrent ? previous : row.current,
		previous: wasCurrent ? null : previous,
		failed,
	};
}

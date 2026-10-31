import type { AppManifest } from "@sumi/contract";
import type { AppVersion, VersionMove, VersionsRow } from "../../shared/schema/installed.schema.js";
import type { AppRegistry, ReleaseFile } from "../../shared/schema/registry.schema.js";

export interface ReleaseRead {
	readonly manifest: unknown;
	readonly release: ReleaseFile;
	readonly manifestSha256: string;
}

export interface InstallAsk {
	readonly id: string;
	readonly path: string;
	readonly manifestSha256: string;
}

export type InstalledRows = Readonly<Record<string, VersionsRow>>;

export abstract class AppsGateway {
	abstract readRegistry(): Promise<AppRegistry>;
	abstract readInstalled(): Promise<InstalledRows>;
	abstract readManifest(installed: AppVersion): Promise<AppManifest>;
	abstract readRelease(path: string): Promise<ReleaseRead>;
	abstract fileUrlOf(installed: AppVersion, file: string): string;
	abstract install(ask: InstallAsk): Promise<AppVersion>;
	abstract switchTo(target: AppVersion): Promise<VersionMove>;
	abstract markFailed(failed: AppVersion): Promise<VersionMove>;
	abstract retry(target: AppVersion): Promise<VersionMove>;
}

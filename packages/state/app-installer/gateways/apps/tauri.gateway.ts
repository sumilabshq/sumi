import { z } from "zod";
import type { AppManifest } from "@sumi/contract";
import {
	AppIdSchema,
	AppVersionSchema,
	VersionMoveSchema,
	VersionsRowSchema,
} from "../../shared/schema/installed.schema.js";
import type { AppVersion, VersionMove } from "../../shared/schema/installed.schema.js";
import { ReleaseFileSchema } from "../../shared/schema/registry.schema.js";
import type { AppRegistry } from "../../shared/schema/registry.schema.js";
import { appFileUrlOf } from "../../shared/lib/app-file-url.js";
import { AppInstallerRefusedError } from "../../shared/lib/installer-refusal.js";
import { parseRegistry } from "../../shared/lib/registry-read.js";
import { parseManifest } from "../../shared/lib/release-gate.js";
import { AppsGateway } from "./apps.gateway.js";
import type { InstallAsk, InstalledRows, ReleaseRead } from "./apps.gateway.js";

const InstalledAnswerSchema = z
	.object({
		apps: z.record(AppIdSchema, VersionsRowSchema),
	})
	.strict();

const InspectAnswerSchema = z
	.object({
		manifest: z.unknown(),
		release: ReleaseFileSchema,
		manifestSha256: z.string().regex(/^[0-9a-f]{64}$/),
	})
	.strict();

type Invoke = (command: string, args: Readonly<Record<string, unknown>>) => Promise<unknown>;

type FetchText = (url: string) => Promise<string>;

const APPS_PLUGIN = "plugin:apps|";
const MANIFEST_FILE = "sumi-app.json";

export class TauriAppsGateway extends AppsGateway {
	constructor(
		private readonly invoke: Invoke,
		private readonly fetchText: FetchText,
	) {
		super();
	}

	override async readRegistry(): Promise<AppRegistry> {
		return parseRegistry(await this.call("registry", {}));
	}

	override async readInstalled(): Promise<InstalledRows> {
		return this.parsed(InstalledAnswerSchema, "installed", await this.call("installed", {})).apps;
	}

	override async readManifest(installed: AppVersion): Promise<AppManifest> {
		const read = parseManifest(JSON.parse(await this.fetchText(appFileUrlOf(installed, MANIFEST_FILE))));

		if (!read.ok) {
			throw new Error(read.reason);
		}

		return read.manifest;
	}

	override async readRelease(path: string): Promise<ReleaseRead> {
		return this.parsed(InspectAnswerSchema, "inspect", await this.call("inspect", { path }));
	}

	override fileUrlOf(installed: AppVersion, file: string): string {
		return appFileUrlOf(installed, file);
	}

	override async install(ask: InstallAsk): Promise<AppVersion> {
		return this.parsed(AppVersionSchema, "install", await this.call("install", { ...ask }));
	}

	override async switchTo(target: AppVersion): Promise<VersionMove> {
		return this.parsed(VersionMoveSchema, "switch", await this.call("switch", { ...target }));
	}

	override async markFailed(failed: AppVersion): Promise<VersionMove> {
		return this.parsed(VersionMoveSchema, "fail", await this.call("fail", { ...failed }));
	}

	override async retry(target: AppVersion): Promise<VersionMove> {
		return this.parsed(VersionMoveSchema, "retry", await this.call("retry", { ...target }));
	}

	private async call(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
		try {
			return await this.invoke(`${APPS_PLUGIN}${command}`, args);
		} catch (refused: unknown) {
			if (typeof refused === "string") {
				throw new AppInstallerRefusedError(refused);
			}

			throw refused;
		}
	}

	private parsed<T>(schema: z.ZodType<T>, command: string, answer: unknown): T {
		const read = schema.safeParse(answer);

		if (!read.success) {
			throw new Error(`the app installer answered ${command} in a shape Sumi does not read: ${read.error.message}`);
		}

		return read.data;
	}
}

import type { AppsGateway } from "../../../gateways/apps/apps.gateway.js";
import { isNewerVersion } from "../../../shared/lib/app-versions.js";
import { parseGatedManifest, refuseReservedId } from "../../../shared/lib/release-gate.js";
import { relayRefusals } from "../../../shared/lib/installer-refusal.js";
import type { AppUpdates, AppVersion, VersionsRow } from "../../../shared/schema/installed.schema.js";
import type { AppRegistry, RegistryRow } from "../../../shared/schema/registry.schema.js";
import { logMove } from "./version-log.js";

type InstallOutcome =
	| {
			readonly ok: true;
			readonly installed: AppVersion;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

interface UpdateCheck {
	readonly staged: AppVersion | null;
	readonly refusal: string | null;
}

interface UpdateCheckRow extends UpdateCheck {
	readonly id: string;
}

const FROM_GITHUB = "installing from GitHub is not built yet";
const GITHUB_REFUSED: InstallOutcome = {
	ok: false,
	reason: FROM_GITHUB,
};
const NOTHING_NEWER: UpdateCheck = {
	staged: null,
	refusal: null,
};

export async function installGated(apps: AppsGateway, { id, source }: RegistryRow): Promise<InstallOutcome> {
	if (source.kind === "github") {
		return GITHUB_REFUSED;
	}

	const { manifest, manifestSha256 } = await relayRefusals(() => apps.readRelease(source.path));
	const gated = parseGatedManifest(id, manifest);

	if (!gated.ok) {
		return gated;
	}

	return {
		ok: true,
		installed: await relayRefusals(() => apps.install({ id, path: source.path, manifestSha256 })),
	};
}

export async function updateApps(apps: AppsGateway, registry: AppRegistry): Promise<AppUpdates> {
	const checked = await checkedRows(apps, registry);
	const switching = await Promise.all(
		checked.flatMap(({ staged }) => (staged === null ? [] : [switchStaged(apps, staged)])),
	);
	return {
		switched: switching.flatMap(({ staged, refusal }) => (refusal === null && staged !== null ? [staged] : [])),
		refusals: [...checked, ...switching].flatMap(({ id, refusal }) =>
			refusal === null ? [] : [{ id, reason: refusal }],
		),
	};
}

async function checkedRows(apps: AppsGateway, registry: AppRegistry): Promise<readonly UpdateCheckRow[]> {
	const installed = await apps.readInstalled();
	return Promise.all(
		registry.apps.flatMap((row) => {
			const versions = installed[row.id];
			return versions === undefined || refuseReservedId(row.id) !== null ? [] : [checkedRow(apps, row, versions)];
		}),
	);
}

async function checkedRow(apps: AppsGateway, row: RegistryRow, versions: VersionsRow): Promise<UpdateCheckRow> {
	try {
		return {
			...(await stageNewer(apps, row, versions)),
			id: row.id,
		};
	} catch (failure: unknown) {
		return {
			id: row.id,
			staged: null,
			refusal: reasonOf(failure),
		};
	}
}

async function stageNewer(apps: AppsGateway, row: RegistryRow, versions: VersionsRow): Promise<UpdateCheck> {
	if (row.source.kind === "github") {
		return refusedCheckOf(FROM_GITHUB);
	}

	const { manifest, manifestSha256 } = await apps.readRelease(row.source.path);
	const gated = parseGatedManifest(row.id, manifest);

	if (!gated.ok) {
		return refusedCheckOf(gated.reason);
	}

	if (!isWantedUpdate(gated.manifest.version, versions)) {
		return NOTHING_NEWER;
	}

	return stagedCheckOf(await apps.install({ id: row.id, path: row.source.path, manifestSha256 }));
}

function stagedCheckOf(staged: AppVersion): UpdateCheck {
	return {
		staged,
		refusal: null,
	};
}

function isWantedUpdate(version: string, { current, failed }: VersionsRow): boolean {
	return isNewerVersion(version, current) && !failed.includes(version);
}

function refusedCheckOf(refusal: string): UpdateCheck {
	return {
		staged: null,
		refusal,
	};
}

async function switchStaged(apps: AppsGateway, staged: AppVersion): Promise<UpdateCheckRow> {
	try {
		logMove(staged, await apps.switchTo(staged), "switched to by an update");
		return switchedRowOf(staged, null);
	} catch (failure: unknown) {
		return switchedRowOf(staged, reasonOf(failure));
	}
}

function switchedRowOf(staged: AppVersion, refusal: string | null): UpdateCheckRow {
	return {
		id: staged.id,
		staged,
		refusal,
	};
}

function reasonOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

import type { AppsGateway } from "../../../gateways/apps/apps.gateway.js";
import type {
	AppVersion,
	InstalledApp,
	InstalledApps,
	InstalledFace,
	VersionsRow,
} from "../../../shared/schema/installed.schema.js";

type FaceRead =
	| {
			readonly ok: true;
			readonly face: InstalledFace;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

export async function installedAppsOf(apps: AppsGateway): Promise<InstalledApps> {
	const rows = await apps.readInstalled();
	return {
		apps: await Promise.all(Object.entries(rows).map(([id, row]) => installedAppOf(apps, id, row))),
	};
}

export async function readCurrentVersion(apps: AppsGateway, id: string): Promise<string | null> {
	return (await apps.readInstalled())[id]?.current ?? null;
}

async function installedAppOf(apps: AppsGateway, id: string, row: VersionsRow): Promise<InstalledApp> {
	if (row.current === null) {
		return {
			...row,
			id,
			face: null,
			problem: null,
		};
	}

	return {
		...row,
		id,
		...faceFieldsOf(await readFace(apps, id, row.current), `${id} ${row.current}`),
	};
}

function faceFieldsOf(read: FaceRead, release: string): Pick<InstalledApp, "face" | "problem"> {
	if (read.ok) {
		return {
			face: read.face,
			problem: null,
		};
	}

	return {
		face: null,
		problem: `${release}: ${read.reason}`,
	};
}

async function readFace(apps: AppsGateway, id: string, version: string): Promise<FaceRead> {
	try {
		return {
			ok: true,
			face: await faceOf(apps, {
				id,
				version,
			}),
		};
	} catch (failure: unknown) {
		return unreadFaceOf(`${id} ${version}`, failure);
	}
}

async function faceOf(apps: AppsGateway, installed: AppVersion): Promise<InstalledFace> {
	const manifest = await apps.readManifest(installed);
	return {
		name: manifest.name,
		version: manifest.version,
		pageUrl: apps.fileUrlOf(installed, manifest.ui),
	};
}

function unreadFaceOf(release: string, failure: unknown): FaceRead {
	const reason = failure instanceof Error ? failure.message : String(failure);
	console.error(`[widgetarium] the manifest of ${release} could not be read: ${reason}`);
	return {
		ok: false,
		reason,
	};
}

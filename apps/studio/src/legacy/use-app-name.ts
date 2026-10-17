import { useEffect, useState } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";

interface AppNameRead {
	readonly appId: string;
	readonly name: string;
}

const NOT_READ = "[widgetarium] the name of {app} could not be read";

export function useAppName(studio: StudioHostPort, appId: string): string | null {
	const [nameRead, setNameRead] = useState<AppNameRead | null>(null);
	useEffect(() => {
		let isCurrent = true;
		void appNameOf(studio, appId).then((name) => {
			if (isCurrent && name !== null) setNameRead({ appId, name });
		});
		return () => {
			isCurrent = false;
		};
	}, [studio, appId]);
	return nameRead?.appId === appId ? nameRead.name : null;
}

async function appNameOf(studio: StudioHostPort, appId: string): Promise<string | null> {
	try {
		const apps = await studio.apps();
		return apps.find((held) => held.id === appId)?.name ?? null;
	} catch (failed: unknown) {
		console.error(NOT_READ.replace("{app}", appId), failed);
		return null;
	}
}

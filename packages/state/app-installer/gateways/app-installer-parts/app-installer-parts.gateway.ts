import { invoke } from "@tauri-apps/api/core";
import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import { appFileUrlOf } from "../../shared/lib/app-file-url.js";
import type { AppsGateway } from "../apps/apps.gateway.js";
import { MemoryAppsGateway } from "../apps/memory.gateway.js";
import { TauriAppsGateway } from "../apps/tauri.gateway.js";

type AppInstallerGateways = {
	readonly apps: AppsGateway;
};

const NO_APPS = {
	apps: [],
};

const GATEWAYS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => AppInstallerGateways>> = {
	browser: memoryAppInstallerGateways,
	tauri: tauriAppInstallerGateways,
	server: memoryAppInstallerGateways,
};

export function appInstallerPartsOn(facts: ModuleFacts): AppInstallerGateways {
	return GATEWAYS_ON[facts.platform](facts);
}

function memoryAppInstallerGateways(): AppInstallerGateways {
	return {
		apps: new MemoryAppsGateway({
			registry: NO_APPS,
			folders: {},
			fileUrlOf: appFileUrlOf,
		}),
	};
}

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too, as in the layout's picker
function tauriAppInstallerGateways(): AppInstallerGateways {
	return {
		apps: new TauriAppsGateway((command, args) => invoke(command, args), fetchTextOrThrow),
	};
}

async function fetchTextOrThrow(url: string): Promise<string> {
	const answer = await fetch(url);

	if (!answer.ok) {
		throw new Error(`${url} answered ${answer.status}`);
	}

	return answer.text();
}

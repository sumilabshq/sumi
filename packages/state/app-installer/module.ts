import { Device, module } from "@widgetarium/core/requests";
import { appInstallerPartsOn } from "./gateways/app-installer-parts/app-installer-parts.gateway.js";
import {
	FailAppVersionCommand,
	InstallAppCommand,
	InstalledAppsQuery,
	RetryAppVersionCommand,
	SwitchAppVersionCommand,
	UpdateAppsCommand,
} from "./features/installing/requests.js";
import { AppRegistryQuery } from "./features/registry/requests.js";

export const AppInstallerModule = module("app-installer")
	.on(Device)
	.public(
		AppRegistryQuery,
		InstalledAppsQuery,
		InstallAppCommand,
		UpdateAppsCommand,
		SwitchAppVersionCommand,
		FailAppVersionCommand,
		RetryAppVersionCommand,
	)
	.provide((facts) => appInstallerPartsOn(facts));

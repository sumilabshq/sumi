import { Repeatable, command, query, refuse } from "@widgetarium/core/requests";
import { AppsGateway } from "../../gateways/apps/apps.gateway.js";
import { InstalledAppsChangedEvent } from "../../shared/events/installed-apps.events.js";
import { findRegistryRow } from "../../shared/lib/registry-read.js";
import { refuseReservedId } from "../../shared/lib/release-gate.js";
import {
	AppIdAskSchema,
	AppUpdatesSchema,
	AppVersionSchema,
	InstalledAppsSchema,
	VersionsRowSchema,
} from "../../shared/schema/installed.schema.js";
import { relayRefusals } from "../../shared/lib/installer-refusal.js";
import { installedAppsOf, readCurrentVersion } from "./lib/installed-apps.js";
import { installGated, updateApps } from "./lib/release-installing.js";
import { logMove } from "./lib/version-log.js";

const NOT_LISTED = '"{id}" is not in the registry';

export const InstalledAppsQuery = query("installed-apps")
	.output(InstalledAppsSchema)
	.inject({ apps: AppsGateway })
	.handle((_input, { apps }) => installedAppsOf(apps));

export const InstallAppCommand = command("install-app")
	.input(AppIdAskSchema)
	.output(AppVersionSchema)
	.idempotencyKey(Repeatable)
	.inject({ apps: AppsGateway })
	.emits(InstalledAppsChangedEvent)
	.handle(async ({ id }, { apps, invalidate, emit }) => {
		const row = findRegistryRow(await apps.readRegistry(), id);

		if (row === null) {
			return refuse(NOT_LISTED.replace("{id}", id));
		}

		const reserved = refuseReservedId(id);

		if (reserved !== null) {
			return refuse(reserved);
		}

		const installing = await installGated(apps, row);

		if (!installing.ok) {
			return refuse(installing.reason);
		}

		invalidate(InstalledAppsQuery);
		emit(InstalledAppsChangedEvent);
		const now = await readCurrentVersion(apps, id);
		console.info(`[widgetarium] app ${id} installed ${installing.installed.version}; current ${now ?? "none"}`);
		return installing.installed;
	});

export const UpdateAppsCommand = command("update-apps")
	.output(AppUpdatesSchema)
	.idempotencyKey(Repeatable)
	.inject({ apps: AppsGateway })
	.emits(InstalledAppsChangedEvent)
	.handle(async (_input, { apps, invalidate, emit }) => {
		const updates = await updateApps(apps, await apps.readRegistry());
		invalidate(InstalledAppsQuery);
		emit(InstalledAppsChangedEvent);
		const said = updates.switched.map(({ id, version }) => `${id} ${version}`).join(", ") || "none";
		console.info(`[widgetarium] apps updated: switched ${said}; refused ${updates.refusals.length}`);
		return updates;
	});

export const SwitchAppVersionCommand = command("switch-app-version")
	.input(AppVersionSchema)
	.output(VersionsRowSchema)
	.idempotencyKey(Repeatable)
	.inject({ apps: AppsGateway })
	.emits(InstalledAppsChangedEvent)
	.handle(async (target, { apps, invalidate, emit }) => {
		const move = await relayRefusals(() => apps.switchTo(target));
		invalidate(InstalledAppsQuery);
		emit(InstalledAppsChangedEvent);
		logMove(target, move, "switched to");
		return move.now;
	});

export const FailAppVersionCommand = command("fail-app-version")
	.input(AppVersionSchema)
	.output(VersionsRowSchema)
	.idempotencyKey(Repeatable)
	.inject({ apps: AppsGateway })
	.emits(InstalledAppsChangedEvent)
	.handle(async (failed, { apps, invalidate, emit }) => {
		const move = await relayRefusals(() => apps.markFailed(failed));
		invalidate(InstalledAppsQuery);
		emit(InstalledAppsChangedEvent);
		logMove(failed, move, "failed");
		return move.now;
	});

export const RetryAppVersionCommand = command("retry-app-version")
	.input(AppVersionSchema)
	.output(VersionsRowSchema)
	.idempotencyKey(Repeatable)
	.inject({ apps: AppsGateway })
	.emits(InstalledAppsChangedEvent)
	.handle(async (target, { apps, invalidate, emit }) => {
		const move = await relayRefusals(() => apps.retry(target));
		invalidate(InstalledAppsQuery);
		emit(InstalledAppsChangedEvent);
		logMove(target, move, "tried again");
		return move.now;
	});

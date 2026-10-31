import { MemoryAppsGateway } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import type { HeldApps } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import type { InstallAsk } from "../packages/state/app-installer/gateways/apps/apps.gateway.ts";
import { appFileUrlOf } from "../packages/state/app-installer/shared/lib/app-file-url.ts";

export function heldAppsOf(registry: unknown, folders: HeldApps["folders"]): HeldApps {
	return {
		registry,
		folders,
		fileUrlOf: appFileUrlOf,
	};
}

export class InstallsRecorded extends MemoryAppsGateway {
	readonly asked: InstallAsk[] = [];

	override install(ask: InstallAsk): ReturnType<MemoryAppsGateway["install"]> {
		this.asked.push(ask);
		return super.install(ask);
	}
}

export async function outputOf<T>(
	answer: Promise<{ ok: true; output: T } | { ok: false; reason: string }>,
): Promise<T | string> {
	const settled = await answer;
	return settled.ok ? settled.output : `refused: ${settled.reason}`;
}

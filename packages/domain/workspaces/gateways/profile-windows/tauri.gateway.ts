import type { ProfileWindowsIpc } from "../../shared/host/workspaces.host.js";
import { ProfileWindowsGateway } from "./profile-windows.gateway.js";

const OPEN_PROFILE_WINDOW = "plugin:browser|open_profile_window";

export class TauriProfileWindowsGateway extends ProfileWindowsGateway {
	constructor(private readonly ipc: ProfileWindowsIpc) {
		super();
	}

	async openWindow(profileId: string, reason: string): Promise<void> {
		await this.ipc.invoke(OPEN_PROFILE_WINDOW, { profile: profileId });
		console.info(`[widgetarium] ${reason}`);
	}
}

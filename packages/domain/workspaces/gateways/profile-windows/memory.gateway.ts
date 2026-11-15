import { ProfileWindowsGateway } from "./profile-windows.gateway.js";

export class MemoryProfileWindowsGateway extends ProfileWindowsGateway {
	readonly opened: string[] = [];

	openWindow(profileId: string, reason: string): Promise<void> {
		this.opened.push(profileId);
		console.info(`[widgetarium] ${reason}`);
		return Promise.resolve();
	}
}

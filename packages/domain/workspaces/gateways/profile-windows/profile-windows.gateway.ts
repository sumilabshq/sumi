export abstract class ProfileWindowsGateway {
	abstract openWindow(profileId: string, reason: string): Promise<void>;
}

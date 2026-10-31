import { refuse } from "@widgetarium/core/requests";

export class AppInstallerRefusedError extends Error {}

export async function relayRefusals<T>(write: () => Promise<T>): Promise<T> {
	try {
		return await write();
	} catch (failure: unknown) {
		if (failure instanceof AppInstallerRefusedError) {
			return refuse(failure.message);
		}

		throw failure;
	}
}

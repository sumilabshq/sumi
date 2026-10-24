import { reasonOf } from "@widgetarium/core/requests";
import type { RefusalHandler } from "@widgetarium/core/requests";

const RETURNED = "canvas/return";

export async function returned(opening: Promise<void>, onRefused: RefusalHandler): Promise<void> {
	try {
		await opening;
	} catch (failure) {
		onRefused({
			name: RETURNED,
			reason: reasonOf(failure),
			ran: true,
		});
	}
}

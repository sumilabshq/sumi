import { reasonOf } from "@widgetarium/data-framework";
import type { RefusalHandler } from "@widgetarium/data-framework";

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

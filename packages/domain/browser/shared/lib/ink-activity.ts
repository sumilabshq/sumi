import type { InkActivity } from "../schema/ink-activity.schema.js";

export function activityWith(activity: InkActivity, changed: Partial<InkActivity>): InkActivity {
	return {
		...activity,
		...changed,
	};
}

export function isSameActivity(was: InkActivity, became: InkActivity): boolean {
	return (
		was.reading === became.reading && was.contentReadAt === became.contentReadAt && was.stoppedAt === became.stoppedAt
	);
}

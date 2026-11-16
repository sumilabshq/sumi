export interface SessionGroup<R> {
	readonly label: string;
	readonly rows: readonly R[];
}

const TODAY = "Today";
const YESTERDAY = "Yesterday";
const PREVIOUS_WEEK = "Previous 7 days";
const OLDER = "Older";
const LABELS = [TODAY, YESTERDAY, PREVIOUS_WEEK, OLDER];
const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;

export function sessionGroupsOf<R extends { readonly lastAt: number }>(
	rows: readonly R[],
	now: number,
): readonly SessionGroup<R>[] {
	const startOfToday = new Date(now).setHours(0, 0, 0, 0);
	return LABELS.map((label) => ({
		label,
		rows: rows.filter(({ lastAt }) => dayLabelOf(lastAt, startOfToday) === label),
	})).filter(({ rows: grouped }) => grouped.length > 0);
}

function dayLabelOf(lastAt: number, startOfToday: number): string {
	if (lastAt >= startOfToday) {
		return TODAY;
	}

	const daysAgo = Math.ceil((startOfToday - lastAt) / DAY_MS);

	if (daysAgo <= 1) {
		return YESTERDAY;
	}

	return daysAgo <= WEEK_DAYS ? PREVIOUS_WEEK : OLDER;
}

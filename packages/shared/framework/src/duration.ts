declare const DURATION: unique symbol;

export type Duration = number & { readonly [DURATION]: "ms" };

export interface DurationParts {
	readonly hours?: number;
	readonly minutes?: number;
	readonly seconds?: number;
}

const MS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;

export function duration({ hours = 0, minutes = 0, seconds = 0 }: DurationParts): Duration {
	const total = ((hours * MINUTES_IN_HOUR + minutes) * SECONDS_IN_MINUTE + seconds) * MS_IN_SECOND;
	return msOf(total);
}

export function seconds(count: number): Duration {
	return duration({ seconds: count });
}

export function minutes(count: number): Duration {
	return duration({ minutes: count });
}

export function hours(count: number): Duration {
	return duration({ hours: count });
}

function msOf(total: number): Duration;
function msOf(total: number): number {
	return total;
}

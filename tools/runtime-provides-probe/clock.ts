export class Clock {
	now(): number {
		return 0;
	}
}

declare module "@widgetarium/data-framework" {
	interface RuntimeProvides {
		readonly clock: Clock;
	}
}

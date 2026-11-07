import { MemoryRateLimits, runtime } from "@widgetarium/data-framework";
import { Clock } from "./clock";

export const provided = runtime()
	.provide(() => ({ rateLimits: new MemoryRateLimits(), clock: new Clock() }))
	.start();

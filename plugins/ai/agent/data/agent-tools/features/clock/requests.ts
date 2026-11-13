import { PerCall } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { NowSchema, WaitAskedSchema, WaitedSchema } from "../../shared/schema/clock.schema.js";

export const getNow = query()
	.public()
	.metadata({
		description: "The current date and time, in UTC and in the person's own time zone.",
		mcp: { kind: "other", running: "Checking the time", done: "Checked the time" },
	})
	.output(NowSchema)
	.handle((_input, { clock }) => {
		const now = clock.now();
		const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
		return {
			utc: now.toISOString(),
			local: now.toLocaleString("sv-SE", { timeZone, timeZoneName: "short" }),
			timeZone,
		};
	});

export const wait = command()
	.public()
	.metadata({
		description:
			"Wait some seconds, up to 600, before going on: for a build, a deploy or a process you started to get further.",
		mcp: { kind: "other", running: "Waiting", done: "Waited", shows: "seconds" },
	})
	.input(WaitAskedSchema)
	.output(WaitedSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ seconds }, { clock }) => {
		await clock.pause(seconds * 1000);
		return { waitedSeconds: seconds };
	});

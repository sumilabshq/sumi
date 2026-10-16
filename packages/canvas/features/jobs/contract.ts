import { z } from "zod";
import { PerCall, command, query } from "@widgetarium/core/requests";
import { ShownJobSchema } from "../../schema/job.schema.js";

export const JobStatusQuery = query("canvas/job-status").output(z.object({ shown: ShownJobSchema.nullable() }));

export const StopJobCommand = command("canvas/stop-job")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(PerCall);

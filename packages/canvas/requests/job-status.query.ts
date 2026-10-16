import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { ShownJobSchema } from "../schema/job.schema.js";

export const JobStatusQuery = query("canvas/job-status").output(z.object({ shown: ShownJobSchema.nullable() }));

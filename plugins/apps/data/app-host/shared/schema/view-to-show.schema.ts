import { z } from "zod";
import { StudioViewSchema } from "./studio-view.schema.js";

export const ViewToShowSchema = z.object({ view: StudioViewSchema });

import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { CanvasModeSchema } from "../schema/canvas-view.schema.js";

export const ModeQuery = query("canvas/mode").output(z.object({ mode: CanvasModeSchema }));

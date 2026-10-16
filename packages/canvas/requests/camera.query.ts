import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { CameraSchema } from "../schema/camera.schema.js";

export const CameraQuery = query("canvas/camera").output(z.object({ camera: CameraSchema.nullable() }));

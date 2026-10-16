import { command } from "@widgetarium/core/mediator";
import { PictureAskSchema } from "../schema/frame-picture.schema.js";

export const AskForPictureCommand = command("canvas/ask-for-picture").input(PictureAskSchema).idempotencyKey("none");

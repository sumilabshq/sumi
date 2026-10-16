import { command } from "@widgetarium/core/mediator";

export const ReturnToViewCommand = command("canvas/return-to-view").idempotencyKey("none");

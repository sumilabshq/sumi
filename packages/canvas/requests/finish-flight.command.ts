import { command } from "@widgetarium/core/mediator";

export const FinishFlightCommand = command("canvas/finish-flight").idempotencyKey("none");

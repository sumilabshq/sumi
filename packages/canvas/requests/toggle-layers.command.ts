import { command } from "@widgetarium/core/mediator";

export const ToggleLayersCommand = command("canvas/toggle-layers").idempotencyKey("none");

import { command } from "@widgetarium/core/mediator";

export const ToggleLayoutLockCommand = command("canvas/toggle-layout-lock").idempotencyKey("none");

import { Repeatable, command } from "@widgetarium/core/requests";

export const ClosePanelCommand = command("app-host/close-panel").idempotencyKey(Repeatable);

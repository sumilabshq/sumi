import { command } from "@widgetarium/core/mediator";

export const ShowAgentPageCommand = command("canvas/show-agent-page").idempotencyKey("none");

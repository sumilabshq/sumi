import { event, windowEvent } from "@widgetarium/data-framework";

export const windowLeft = event().from(windowEvent("blur"));

export const windowCameBack = event().from(windowEvent("focus"));

import { event, windowEvent } from "@widgetarium/data-framework";

export const WindowLeftEvent = event("window-left").from(windowEvent("blur"));

export const WindowCameBackEvent = event("window-came-back").from(windowEvent("focus"));

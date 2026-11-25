import { plugin } from "@widgetarium/plugin-framework";
import metadata from "../metadata.json" with { type: "json" };

export const sumiHost = plugin("sumi-host").describe(metadata);

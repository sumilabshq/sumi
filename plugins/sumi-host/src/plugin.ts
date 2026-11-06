import { plugin } from "@widgetarium/plugin-framework";
import { BackgroundModulesSlot, TabPageSlot } from "./slots.js";

export const SumiHostPlugin = plugin("sumi-host").declare(BackgroundModulesSlot, TabPageSlot);

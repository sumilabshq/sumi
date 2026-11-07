import { plugin } from "@widgetarium/plugin-framework";
import {
	BackgroundModulesSlot,
	FrameModulesSlot,
	TabPageSlot,
	WindowLayersSlot,
	WindowModulesSlot,
	WindowProvidersSlot,
} from "./slots.js";

export const SumiHostPlugin = plugin("sumi-host").declare(
	BackgroundModulesSlot,
	TabPageSlot,
	WindowModulesSlot,
	WindowLayersSlot,
	WindowProvidersSlot,
	FrameModulesSlot,
);

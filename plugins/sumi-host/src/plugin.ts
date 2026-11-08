import { plugin } from "@widgetarium/plugin-framework";
import {
	backgroundModules,
	frameModules,
	tabPage,
	windowLayers,
	windowModules,
	windowProviders,
	windowServerModules,
} from "./slots.js";

export const sumiHost = plugin("sumi-host").declare(
	backgroundModules,
	tabPage,
	windowModules,
	windowLayers,
	windowProviders,
	frameModules,
	windowServerModules,
);

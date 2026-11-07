import { Device, module } from "@widgetarium/data-framework";
import { canvasPartsOn } from "./gateways/canvas-parts/canvas-parts.gateway.js";
import type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";
import { handled } from "./generated/handled.js";

export type { AgentJobs } from "./shared/host/agent-jobs.host.js";
export type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";

export const CanvasModule = module("canvas")
	.on(Device)
	.config<CanvasHosts>()
	.provide((facts) => canvasPartsOn(facts))
	.handles(...handled);

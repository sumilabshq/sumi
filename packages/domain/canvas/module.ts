import { Device, module } from "@widgetarium/data-framework";
import { canvasPartsOn } from "./gateways/canvas-parts/canvas-parts.gateway.js";
import type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";

export type { AgentJobs } from "./shared/host/agent-jobs.host.js";
export type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";

export const canvas = module("canvas")
	.on(Device)
	.config<CanvasHosts>()
	.provide((facts) => canvasPartsOn(facts));

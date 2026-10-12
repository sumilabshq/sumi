import type { DesignSource, DrawnDesign } from "@widgetarium/canvas";
import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";

const HOME = "/";

export function projectDesignSource(project: StartedProject): DesignSource {
	const drawing = { registry: project.registry, host: project.hostOf(project.routes[0]?.path ?? HOME) };
	return {
		design: async () => projectDesignOf(project),
		docs: async () => [],
		jobs: () => [],
		onJobs: () => () => undefined,
		liveJob: () => null,
		stopJob: refuseOffHost,
		drawing: () => drawing,
		onChanged: () => () => undefined,
		addPhotos: refuseOffHost,
		moveLayer: refuseOffHost,
		returnToView: refuseOffHost,
		look: async () => null,
		pickLook: refuseOffHost,
		pictureOf: null,
	};
}

function projectDesignOf({ routes, registry }: StartedProject): DrawnDesign {
	const withStates = registry.ids().filter((id) => Object.keys(registry.get(id)?.states ?? {}).length > 0);
	return {
		screens: routes.map((route) => ({
			name: route.path,
			states: [{ name: route.path, board: normalizeBoard(route.board) }],
		})),
		references: [],
		widgets: withStates.map((id) => ({ id, isFromCatalogue: false })),
	};
}

function refuseOffHost(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}

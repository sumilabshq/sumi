import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { WidgetDefinition } from "@widgetarium/core/registry.js";

type Registry = WidgetSurfaceProps["registry"];

const BLOCK_SEPARATOR = "#";

export function blockIdOf(draft: string, block: string): string {
	return `${draft}${BLOCK_SEPARATOR}${block}`;
}

export function blocksOf(registry: Registry, draft: string): string[] {
	return Object.keys(registry.get(draft)?.blocks ?? {});
}

export function withBlocks(registry: Registry): Registry {
	return {
		list: () => registry.list(),
		get: (id) => (isBlock(id) ? blockDefinitionIn(registry, id) : registry.get(id)),
		tileRefOf: (id) => (isBlock(id) ? id : registry.tileRefOf(id)),
		resolveId: (id) => (isBlock(id) ? id : (registry.resolveId?.(id) ?? id)),
		generationsOf: (key) => registry.generationsOf?.(key) ?? [],
	};
}

function isBlock(id: string | null | undefined): id is string {
	return typeof id === "string" && id.includes(BLOCK_SEPARATOR);
}

function blockDefinitionIn(registry: Registry, id: string): WidgetDefinition | null {
	const [draft = "", block = ""] = id.split(BLOCK_SEPARATOR);
	const definition = registry.get(draft);
	const component = definition?.blocks?.[block];

	if (!definition || !component) {
		return null;
	}

	return {
		...definition,
		component,
		manifest: {
			...definition.manifest,
			id,
			title: block,
			props: {},
		},
	};
}

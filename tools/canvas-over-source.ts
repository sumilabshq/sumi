import { module, provided } from "../packages/core/src/mediator/index.ts";
import type { Module } from "../packages/core/src/mediator/index.ts";
import { canvasModule } from "../packages/canvas/canvas.module.ts";
import { DesignSource } from "../packages/canvas/ports/design-source.port.ts";

export function canvasModuleOver(source: DesignSource): Module {
	const provide = canvasModule.provide.map((pair) =>
		pair.token === DesignSource ? provided(DesignSource, () => source) : pair,
	);
	return module({ ...canvasModule, provide });
}

import CanvasKitInit from "canvaskit-wasm";
import { startGpuCanvas } from "@widgetarium/gpu";
import type { GpuSupply } from "@widgetarium/studio";
import type WidgetariumPlugin from "../main.js";

export const GPU_FILES_FOLDER = "gpu";

export const GPU_FONT_FILES: readonly (readonly ["sans" | "serif", string])[] = [
	["sans", "Inter_400Regular.ttf"],
	["sans", "Inter_500Medium.ttf"],
	["sans", "Inter_600SemiBold.ttf"],
	["serif", "SourceSerif4_400Regular.ttf"],
];

export function obsidianGpuSupply(plugin: WidgetariumPlugin): GpuSupply {
	const { adapter } = plugin.app.vault;
	const pathOf = (file: string): string => `${plugin.manifest.dir ?? ""}/${GPU_FILES_FOLDER}/${file}`;
	return {
		startCanvas: startGpuCanvas,
		loadCanvasKit: () => CanvasKitInit({ locateFile: (file) => adapter.getResourcePath(pathOf(file)) }),
		loadFonts: () =>
			Promise.all(
				GPU_FONT_FILES.map(async ([family, file]) => ({ family, data: await adapter.readBinary(pathOf(file)) })),
			),
	};
}

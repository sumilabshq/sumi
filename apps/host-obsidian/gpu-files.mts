import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const GPU_FOLDER = "apps/host-obsidian/gpu";
const GPU_SOURCES: readonly string[] = [
	"node_modules/canvaskit-wasm/bin/canvaskit.wasm",
	"node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf",
	"node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf",
	"node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
	"node_modules/@expo-google-fonts/source-serif-4/400Regular/SourceSerif4_400Regular.ttf",
];

export function layGpuFiles(): void {
	mkdirSync(GPU_FOLDER, { recursive: true });
	for (const source of GPU_SOURCES) copyFileSync(source, path.join(GPU_FOLDER, path.basename(source)));
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuIcon, GpuText, GpuView } from "../packages/studio/src/features/canvas/gpu/index.ts";
import { NavWord } from "./gpu-fixture-nav-word.tsx";

export function TopBar(): ReactElement {
	return (
		<GpuView className="flex items-center gap-6 h-14 px-6 border-b border-line">
			<GpuView className="flex items-center gap-2">
				<GpuView className="w-7 h-7 rounded-md bg-foreground items-center justify-center">
					<GpuIcon name="languages" size={16} className="text-primary-foreground" />
				</GpuView>
				<GpuText className="text-lg font-semibold text-foreground">Parla</GpuText>
			</GpuView>
			<GpuView className="flex items-center gap-1">
				<NavWord label="Translate" active />
				<NavWord label="Phrasebook" />
				<NavWord label="Documents" />
				<NavWord label="History" />
			</GpuView>
			<GpuView className="flex-1" />
			<GpuText className="text-sm text-muted-foreground tabular-nums">12 of 50 left today</GpuText>
			<GpuView className="w-8 h-8 rounded-full bg-muted border border-line items-center justify-center">
				<GpuText className="text-xs font-medium text-muted-foreground">MR</GpuText>
			</GpuView>
		</GpuView>
	);
}

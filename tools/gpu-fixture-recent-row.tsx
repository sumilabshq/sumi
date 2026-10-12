import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuIcon, GpuText, GpuView } from "../packages/gpu/index.ts";
import type { Recent } from "./gpu-fixture-copy.ts";

export function RecentRow({ entry }: { readonly entry: Recent }): ReactElement {
	return (
		<GpuView
			className="flex items-center gap-4 h-[46px] px-3 border-b border-line hover:bg-muted active:bg-accent transition"
			onPress={() => {}}
		>
			<GpuIcon name="clock" size={16} className="text-muted-foreground" />
			<GpuText className="flex-1 truncate text-base text-foreground">{entry.source}</GpuText>
			<GpuIcon name="arrow-right" size={14} className="text-muted-foreground" />
			<GpuText className="flex-1 truncate text-base text-muted-foreground">{entry.target}</GpuText>
			<GpuText className="w-[64px] text-sm text-muted-foreground">{entry.pair}</GpuText>
			<GpuText className="w-[72px] text-right text-sm text-muted-foreground tabular-nums">{entry.when}</GpuText>
		</GpuView>
	);
}

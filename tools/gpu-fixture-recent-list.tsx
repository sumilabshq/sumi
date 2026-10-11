import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuText, GpuView } from "../packages/studio/src/features/canvas/gpu/index.ts";
import type { Recent } from "./gpu-fixture-copy.ts";
import { RecentRow } from "./gpu-fixture-recent-row.tsx";

export function RecentList({ recent }: { readonly recent: readonly Recent[] }): ReactElement {
	return (
		<GpuView className="gap-3">
			<GpuView className="flex items-center gap-2">
				<GpuText className="text-[17px] leading-[24px] font-semibold text-foreground">Recent</GpuText>
				<GpuText className="text-sm text-muted-foreground tabular-nums">{recent.length}</GpuText>
				<GpuView className="flex-1" />
				<GpuText className="text-sm text-brand">See all history</GpuText>
			</GpuView>
			<GpuView className="border-t border-line">
				{recent.map((entry, row) => (
					<RecentRow key={`${entry.target}-${row}`} entry={entry} />
				))}
			</GpuView>
		</GpuView>
	);
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, Loader, Segmented } from "@widgetarium/kit";
import type { AgentLook } from "../../../schemas/agent-look.schema.js";
import type { PageRenderer } from "../../../schemas/canvas-view.schema.js";

const PREPARING = "Preparing pictures · {count}";
const LOOKING_AT_PAGE = "Agent is looking at {where}";
const LOOKING_AT_DESIGN = "Agent is looking at the whole design";
const GO_THERE = "Go to the page the agent is looking at";
const RENDERERS: readonly { readonly value: PageRenderer; readonly label: string }[] = [
	{ value: "html", label: "HTML" },
	{ value: "gpu", label: "GPU" },
];

export function PicturesProgress({ waiting }: { readonly waiting: number }): ReactElement | null {
	if (waiting === 0) return null;
	return <Loader label={PREPARING.replace("{count}", String(waiting))} />;
}

export function AgentLookChip({
	look,
	onPage,
}: {
	readonly look: AgentLook | null;
	readonly onPage: (page: string) => void;
}): ReactElement | null {
	if (!look) return null;
	const icon = <Icon name="sparkles" size={14} />;
	if (!look.page)
		return (
			<Button size="s" variant="ghost">
				{icon}
				{LOOKING_AT_DESIGN}
			</Button>
		);
	const where = look.frame ? `${look.page} · ${look.frame}` : look.page;
	return (
		<Button size="s" variant="ghost" title={GO_THERE} onClick={() => onPage(look.page)}>
			{icon}
			{LOOKING_AT_PAGE.replace("{where}", where)}
		</Button>
	);
}

export function RendererToggle({
	renderer,
	onRenderer,
}: {
	readonly renderer: PageRenderer;
	readonly onRenderer: (renderer: PageRenderer) => void;
}): ReactElement {
	return (
		<span className="cv:inline-flex" data-canvas-renderer="">
			<Segmented<PageRenderer> items={RENDERERS} value={renderer} onValueChange={onRenderer} size="s" />
		</span>
	);
}

export function PageLabel({ page, isRunning }: { readonly page: string; readonly isRunning: boolean }): ReactElement {
	if (!isRunning) return <span>{page}</span>;
	return (
		<span className="cv:inline-flex cv:items-center cv:gap-1.5">
			<span className="cv:size-2 cv:flex-none cv:rounded-full cv:bg-brand cv:motion-safe:animate-canvas-pulse" />
			<span>{page}</span>
		</span>
	);
}

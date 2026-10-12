import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RenderedMarkdown } from "@widgetarium/kit";
import type { CanvasDoc } from "../../../../schemas/doc.schema.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

export interface DocsRegionProps {
	readonly title: string;
	readonly docs: readonly CanvasDoc[];
	readonly host: Parameters<typeof RenderedMarkdown>[0]["host"];
}

const DOC = "cv:w-[960px] cv:max-w-full cv:select-text cv:text-[20px] cv:leading-[1.55]";

export function DocsRegion({ title, docs, host }: DocsRegionProps): ReactElement | null {
	if (docs.length === 0) return null;
	return (
		<Region title={title} count={docs.length}>
			{docs.map((doc) => (
				<Group key={doc.path} title={doc.name} sub={doc.path}>
					<RenderedMarkdown
						host={host}
						markdown={doc.markdown}
						path={doc.path}
						className={`${DOC} markdown-rendered`}
						plainClassName={`${DOC} cv:whitespace-pre-wrap`}
					/>
				</Group>
			))}
		</Region>
	);
}

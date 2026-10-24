import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RenderedMarkdown } from "@widgetarium/kit";
import { useDrawing } from "../../../lib/drawing.js";
import type { RegionOf } from "../../../lib/region-of.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

const DOC = "cv:w-[960px] cv:max-w-full cv:select-text cv:text-[20px] cv:leading-[1.55]";

export function DocsRegion({ region }: { readonly region: RegionOf<"docs"> }): ReactElement {
	const { host } = useDrawing();
	return (
		<Region title={region.title} count={region.count}>
			{region.docs.map((doc) => (
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

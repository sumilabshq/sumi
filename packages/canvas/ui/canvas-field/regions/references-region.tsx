import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RegionOf } from "../../../schema/regions.js";
import { NotedPicture } from "../frames/noted-picture.js";
import { Group } from "./group.js";
import { Region } from "./region.js";

export function ReferencesRegion({ region }: { readonly region: RegionOf<"references"> }): ReactElement {
	return (
		<Region title={region.title} count={region.count}>
			{region.references.map((reference) => (
				<Group key={reference.key} title={reference.title} badge={reference.badge} sub={reference.sub}>
					<NotedPicture reference={reference} />
				</Group>
			))}
		</Region>
	);
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@widgetarium/kit";
import { PAGES } from "../../../schemas/canvas-page.schema.js";
import { Region } from "./region.js";

const NOTHING_DRAWN = "No pages drawn yet";
const DRAWN_WHEN =
	"The assistant draws every page here at the design step, after Build it is pressed on the spec card. Ask in the chat to start.";

export function NothingDrawn(): ReactElement {
	return (
		<Region title={PAGES} count={0}>
			<Empty>
				<EmptyHeader>
					<EmptyTitle>{NOTHING_DRAWN}</EmptyTitle>
					<EmptyDescription>{DRAWN_WHEN}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</Region>
	);
}

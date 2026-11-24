import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { StatusMark } from "@sumi/flows-sidebar-plugin";
import { HomeSection } from "../../../../shared/ui/home-section/home-section.js";
import { ageOf } from "../../lib/age-of.js";
import { useRecentFlows } from "../../lib/use-recent-flows.js";

const TITLE = "Continue";
const SHOWN_FIRST = 3;
const SHOWN_MORE = 10;

export function ContinueRows(): ReactElement | null {
	const [isExpanded, setExpanded] = useState(false);
	const recent = useRecentFlows();
	const shown = recent.flows.slice(0, isExpanded ? SHOWN_MORE : SHOWN_FIRST);
	const now = Date.now();

	if (recent.flows.length === 0) {
		return null;
	}

	return (
		<HomeSection title={TITLE}>
			<div className="sumi-home-continue">
				{shown.map((flow) => (
					<button key={flow.id} type="button" className="sumi-home-continue-row" onClick={() => recent.open(flow.id)}>
						<span className="sumi-home-continue-name">{flow.name}</span>
						{flow.folderName === null ? null : <span className="sumi-home-continue-folder">{flow.folderName}</span>}
						<span className="sumi-home-continue-age">{ageOf(flow.lastOpenedAt, now)}</span>
						<StatusMark status={flow.status} />
					</button>
				))}
				{isExpanded || recent.flows.length <= SHOWN_FIRST ? null : (
					<button type="button" className="sumi-home-more" onClick={() => setExpanded(true)}>
						Show more
					</button>
				)}
			</div>
		</HomeSection>
	);
}

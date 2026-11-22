import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";

export interface NearMatchChipProps {
	readonly host: string;
	readonly onOpen: (address: string) => void;
}

const ROW = "cv:mt-[18px] cv:flex cv:justify-center";
const CHIP = "cv:h-10 cv:gap-2 cv:px-4 cv:text-[13px] cv:font-medium";
const MATCH = "cv:font-bold";

export function NearMatchChip({ host, onOpen }: NearMatchChipProps): ReactElement {
	return (
		<div className={ROW}>
			<Button variant="wash" className={CHIP} onClick={() => onOpen(host)} data-browser-near-match={host}>
				<span>
					Did you mean <b className={MATCH}>{host}</b>?
				</span>
			</Button>
		</div>
	);
}

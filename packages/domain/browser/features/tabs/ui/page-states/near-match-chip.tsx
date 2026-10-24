import { createElement as h } from "react";
import type { ReactElement } from "react";
import { BUTTON_RESET, WASH_INK } from "../../../../shared/lib/page-state-look.js";

export interface NearMatchChipProps {
	readonly host: string;
	readonly onOpen: (address: string) => void;
}

const ROW = "cv:mt-[18px] cv:flex cv:justify-center";
const CHIP = `${BUTTON_RESET} ${WASH_INK} cv:h-10 cv:gap-2 cv:rounded-full cv:px-4 cv:shadow-none cv:text-[13px]`;
const MATCH = "cv:font-bold";

export function NearMatchChip({ host, onOpen }: NearMatchChipProps): ReactElement {
	return (
		<div className={ROW}>
			<button type="button" className={CHIP} onClick={() => onOpen(host)} data-browser-near-match={host}>
				<span>
					Did you mean <b className={MATCH}>{host}</b>?
				</span>
			</button>
		</div>
	);
}

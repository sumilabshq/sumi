import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { RAISED_PILL } from "@widgetarium/canvas";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { BrowserTabsQuery, OpenAddressCommand } from "../../contract.js";
import { AccessChip } from "./access-chip.js";
import type { ChipLook } from "./access-chip.js";

const FIELD = `${RAISED_PILL} cv:flex cv:w-[min(36rem,42vw)] cv:min-w-40 cv:shrink cv:items-center cv:gap-2 cv:ps-4 cv:pe-1.5`;
const INPUT =
	"cv:h-10 cv:min-w-0 cv:flex-1 cv:border-0 cv:bg-transparent cv:p-0 cv:font-[inherit] cv:text-sm cv:text-ink cv:shadow-none cv:outline-none cv:placeholder:text-muted-foreground";
const ADDRESS = "Address";
const TYPE_AN_ADDRESS = "Search or type an address";

export function AddressField(): ReactElement {
	const { tabs, inkReading } = useQuery(BrowserTabsQuery).data;
	const shown = tabs.find((tab) => tab.isShown);
	const openAddress = useCommand(OpenAddressCommand);
	const [typed, setTyped] = useState<string | null>(null);
	const address = typed ?? shown?.url ?? "";
	const isReading = inkReading !== null && inkReading.tabId === shown?.id;
	const look: ChipLook | null = isReading ? "reading" : (shown?.access?.decision ?? null);
	const submit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();

		if (!shown || address.trim() === "") {
			return;
		}

		void openAddress.run({
			tabId: shown.id,
			address,
		});
		setTyped(null);
	};
	return (
		<form className={FIELD} onSubmit={submit} data-browser-address="">
			<Icon
				name={address.startsWith("https:") ? "lock" : "globe"}
				size={16}
				className="cv:flex-none cv:text-muted-foreground"
			/>
			<input
				className={INPUT}
				aria-label={ADDRESS}
				placeholder={TYPE_AN_ADDRESS}
				value={address}
				spellCheck={false}
				onChange={(event) => setTyped(event.target.value)}
				onFocus={(event) => event.target.select()}
				onBlur={() => setTyped(null)}
			/>
			{look === null ? null : <AccessChip look={look} />}
		</form>
	);
}

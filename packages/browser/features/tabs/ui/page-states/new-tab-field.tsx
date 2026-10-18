import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface NewTabFieldProps {
	readonly onOpen: (address: string) => void;
}

const FIELD =
	"cv:mt-[26px] cv:box-border cv:flex cv:h-[52px] cv:w-[560px] cv:max-w-full cv:flex-none cv:items-center cv:gap-3 cv:rounded-full cv:border cv:border-edge cv:bg-raise cv:ps-[19px] cv:pe-[5px] cv:text-[16px] cv:text-muted-foreground cv:focus-within:shadow-[0_0_0_2px_var(--brand),0_0_0_6px_var(--accent-wash)]";
const INPUT =
	"cv:h-10 cv:min-w-0 cv:flex-1 cv:border-0 cv:bg-transparent cv:p-0 cv:font-[inherit] cv:text-[16px] cv:text-ink cv:caret-brand cv:shadow-none cv:outline-none cv:placeholder:text-muted-foreground/67";
const GO =
	"cv:grid cv:size-10 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:bg-primary cv:p-0 cv:text-[16px] cv:text-primary-foreground cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const TYPE_AN_ADDRESS = "Search or type an address";
const GO_LABEL = "Go";

export function NewTabField({ onOpen }: NewTabFieldProps): ReactElement {
	const [typed, setTyped] = useState("");
	const submit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();

		if (typed.trim() === "") {
			return;
		}

		onOpen(typed);
	};
	return (
		<form role="search" className={FIELD} onSubmit={submit} data-browser-new-tab-field="">
			<Icon name="search" size={18} className="cv:flex-none" />
			<input
				className={INPUT}
				aria-label={TYPE_AN_ADDRESS}
				placeholder={TYPE_AN_ADDRESS}
				value={typed}
				spellCheck={false}
				autoFocus
				onChange={(event) => setTyped(event.target.value)}
			/>
			<button type="submit" className={GO} aria-label={GO_LABEL}>
				<Icon name="corner-down-left" size={16} />
			</button>
		</form>
	);
}

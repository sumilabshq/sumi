import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Icon, IconButton, Input } from "@widgetarium/kit";

export interface NewTabFieldProps {
	readonly onOpen: (address: string) => void;
}

const FORM = "cv:mt-[26px] cv:flex cv:w-[560px] cv:max-w-full cv:flex-none";
const FIELD = "cv:box-border cv:h-[52px] cv:gap-3 cv:ps-[19px] cv:pe-[5px] cv:text-[16px]";
const GO = "cv:size-10";
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
		<form role="search" className={FORM} onSubmit={submit} data-browser-new-tab-field="">
			<Input
				variant="raised"
				className={FIELD}
				block
				icon={<Icon name="search" size={18} className="cv:flex-none" />}
				end={
					<IconButton type="submit" variant="primary" className={GO} label={GO_LABEL}>
						<Icon name="corner-down-left" size={16} />
					</IconButton>
				}
				aria-label={TYPE_AN_ADDRESS}
				placeholder={TYPE_AN_ADDRESS}
				value={typed}
				spellCheck={false}
				autoFocus
				onChange={(event) => setTyped(event.target.value)}
			/>
		</form>
	);
}

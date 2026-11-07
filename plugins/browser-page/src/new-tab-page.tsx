import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface NewTabPageProps {
	readonly onOpen: (typed: string) => void;
}

const WHERE_TO = "Where to?";
const TYPE_AN_ADDRESS = "Search or type an address";
const GO_LABEL = "Go";

export function NewTabPage({ onOpen }: NewTabPageProps): ReactElement {
	const [typed, setTyped] = useState("");
	const submit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();

		if (typed.trim() === "") {
			return;
		}

		onOpen(typed);
	};
	return (
		<section className="wg-browser-state" data-browser-page-state="idle">
			<h2 className="wg-browser-state-title">{WHERE_TO}</h2>
			<form role="search" className="wg-browser-field" onSubmit={submit} data-browser-new-tab-field="">
				<Icon name="search" size={18} />
				<input
					className="wg-browser-field-input"
					aria-label={TYPE_AN_ADDRESS}
					placeholder={TYPE_AN_ADDRESS}
					value={typed}
					spellCheck={false}
					autoFocus
					onChange={(event) => setTyped(event.target.value)}
				/>
				<button type="submit" className="wg-browser-field-go" aria-label={GO_LABEL}>
					<Icon name="corner-down-left" size={16} />
				</button>
			</form>
		</section>
	);
}

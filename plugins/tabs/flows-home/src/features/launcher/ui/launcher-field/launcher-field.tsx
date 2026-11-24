import { createElement as h } from "react";
import type { FormEvent, ReactElement } from "react";
import { Icon, Input } from "@widgetarium/kit";
import type { Launch, PaneSpot } from "../../lib/launch-types.js";
import { useLauncher } from "../../lib/use-launcher.js";

const PLACEHOLDER = "Open an app, a site, or search";
const SEARCH_ICON_PX = 15;

export function LauncherField(spot: PaneSpot): ReactElement {
	const launcher = useLauncher(spot);
	const submit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		launcher.submit();
	};
	return (
		<form role="search" className="sumi-home-ring" onSubmit={submit}>
			<div className="sumi-home-field">
				<Icon name="search" size={SEARCH_ICON_PX} />
				<Input
					variant="bare"
					block
					className="sumi-home-input"
					aria-label={PLACEHOLDER}
					placeholder={PLACEHOLDER}
					value={launcher.text}
					spellCheck={false}
					autoFocus
					onChange={(event) => launcher.setText(event.target.value)}
				/>
				{launcher.launch === null ? <FieldHints /> : <FieldOutcome launch={launcher.launch} />}
			</div>
		</form>
	);
}

function FieldHints(): ReactElement {
	return (
		<span className="sumi-home-hints">
			<span>
				<b>?</b>Ask
			</span>
			<span>
				<b>/</b>Commands
			</span>
		</span>
	);
}

function FieldOutcome({ launch }: { readonly launch: Launch }): ReactElement {
	return (
		<span className="sumi-home-outcome">
			{launch.label}
			<span className="sumi-home-outcome-tag">{launch.tag}</span>
		</span>
	);
}

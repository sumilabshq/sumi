import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { homePages } from "@sumi/home-pages/contract";
import type { HomePageFace } from "@sumi/home-pages/contract";

export interface HomeSwitchProps {
	readonly pages: readonly HomePageFace[];
	readonly chosen: string;
}

const LABEL = "Home page";

export function HomeSwitch({ pages, chosen }: HomeSwitchProps): ReactElement {
	const choose = useCommand(homePages.pages.choose);
	return (
		<div className="sumi-home-switch" role="group" aria-label={LABEL}>
			<span className="sumi-home-switch-label">{LABEL}</span>
			{pages.map((page) => (
				<button
					key={page.id}
					type="button"
					className="sumi-home-switch-option"
					aria-pressed={page.id === chosen}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => void choose.run({ id: page.id })}
				>
					{page.title}
				</button>
			))}
		</div>
	);
}

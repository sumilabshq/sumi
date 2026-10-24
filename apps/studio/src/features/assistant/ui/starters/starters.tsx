import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { PickStarterCommand } from "@widgetarium/assistant";
import type { Starter } from "@widgetarium/assistant";

interface StarterFace {
	readonly starter: Starter;
	readonly icon: string;
	readonly title: string;
	readonly line: string;
}

const STARTERS: readonly StarterFace[] = [
	{
		starter: "create",
		icon: "code-xml",
		title: "Create an app",
		line: "Describe it in a sentence. Ink writes the code and runs it.",
	},
	{
		starter: "design",
		icon: "layout-panel-left",
		title: "Design the app",
		line: "Screens and look first, drawn on the canvas. No code yet.",
	},
];

export function Starters(): ReactElement {
	const pick = useCommand(PickStarterCommand);
	return (
		<div className="wg-studio-ai-starters">
			{STARTERS.map(({ starter, icon, title, line }) => (
				<button
					key={starter}
					type="button"
					className="wg-studio-ai-starter"
					data-starter={starter}
					onClick={() => void pick.run({ starter })}
				>
					<span className="wg-studio-ai-starter-icon">
						<Icon name={icon} size={20} />
					</span>
					<span className="wg-studio-ai-starter-words">
						<b>{title}</b>
						<span>{line}</span>
					</span>
				</button>
			))}
		</div>
	);
}

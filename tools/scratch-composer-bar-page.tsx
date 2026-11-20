import "./packs-registered.ts";
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import {
	Button,
	Popover,
	PopoverTrigger,
	Select,
	SelectChevron,
	SelectTrigger,
} from "../packages/shared/kit/src/index.ts";
import { UsageRing } from "../plugins/ai/plan-usage/src/features/plan-usage/ui/usage-button/usage-ring.tsx";

const host = document.getElementById("host");
if (!host) throw new Error("composer bar shot: the page has no #host");

function Bar({ isWorking }: { readonly isWorking: boolean }) {
	return (
		<div className={isWorking ? "wg-studio-ai-field is-working" : "wg-studio-ai-field"} style={{ width: "520px" }}>
			<div className="wg-studio-ai-field-bar">
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm">
							Opus
							<SelectChevron />
						</Button>
					</PopoverTrigger>
				</Popover>
				<Select value="medium">
					<SelectTrigger variant="ghost" size="sm">
						Medium
					</SelectTrigger>
				</Select>
				<Select value="auto">
					<SelectTrigger variant="ghost" size="sm">
						Auto
					</SelectTrigger>
				</Select>
				<span className="wg-studio-ai-bar-space" />
				{[0, 0.35, 0.8].map((part) => (
					<Button key={part} variant="ghost" size="sm" className="sumi-usage-button">
						<UsageRing part={part} />
					</Button>
				))}
			</div>
		</div>
	);
}

createRoot(host).render(
	<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
		<Bar isWorking={false} />
		<Bar isWorking={true} />
	</div>,
);

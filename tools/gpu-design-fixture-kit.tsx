import { createElement as h, useState } from "react";
import { Badge, Button, Card, Input, Item, ItemGroup, Segmented } from "@widgetarium/kit";
import { defineLayout, defineMetadata, defineStates } from "../packages/shared/core/src/gateway/declared.js";
import { createWidget } from "../packages/shared/core/src/widget-api.js";

export const KIT_TITLE = "Seed orders";

const VIEWS = [
	{ value: "open", label: "Open" },
	{ value: "sent", label: "Sent" },
];

const SeedOrders = createWidget({
	draw: () => {
		const [view, setView] = useState("open");
		return (
			<Card>
				<div className="flex flex-row items-center justify-between">
					<b>{KIT_TITLE}</b>
					<Badge>{view === "open" ? "3 open" : "5 sent"}</Badge>
				</div>
				<Segmented items={VIEWS} value={view} onValueChange={setView} size="s" />
				<ItemGroup>
					<Item>Kale, 2 packets</Item>
					<Item>Chard, 1 packet</Item>
				</ItemGroup>
				<Input placeholder="Search seeds" />
				<Button size="s">Order more</Button>
			</Card>
		);
	},
});

export const metadata = defineMetadata(SeedOrders, {
	title: "Seed orders",
	description: "Which seeds are still to order?",
	keywords: ["seeds"],
	props: {},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 420, preferredHeight: "auto" } });

export const states = defineStates(SeedOrders, { Open: {} });

export default SeedOrders;

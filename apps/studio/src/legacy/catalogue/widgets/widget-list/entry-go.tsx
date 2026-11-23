import { createElement as h } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { EntryRing } from "./entry-ring.js";
import type { EntryState, Job } from "./types.js";

const GO_CLASS = {
	add: "wg-studio-catalogue-card-go",
	install: "wg-studio-catalogue-card-go is-install",
	update: "wg-studio-catalogue-card-go is-update",
	failed: "wg-studio-catalogue-card-go is-failed",
} as const;

const GLYPH = { add: "plus", install: "download", update: "refresh-cw", failed: "rotate-ccw" } as const;

const ADD_LOOK = { emphasis: "solid", tone: "brand" } as const;

const GHOST_LOOK = { emphasis: "ghost" } as const;

interface EntryGoProps {
	readonly busyJob: Job | null;
	readonly state: EntryState;
	readonly label: string;
	readonly press: () => void;
}

export function EntryGo({ busyJob, state, label, press }: EntryGoProps) {
	if (busyJob) return <EntryRing job={busyJob} label={label} />;
	return (
		<Button
			shape="square"
			className={GO_CLASS[state]}
			{...(state === "add" ? ADD_LOOK : GHOST_LOOK)}
			size="sm"
			label={label}
			onClick={(event) => {
				event.stopPropagation();
				press();
			}}
		>
			<Icon name={GLYPH[state]} size={15} />
		</Button>
	);
}

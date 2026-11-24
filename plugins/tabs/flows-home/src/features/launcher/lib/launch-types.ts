import type { Intent } from "@sumi/command-menu/contract";

export type LaunchAct =
	| {
			readonly kind: "intent";
			readonly intent: Intent;
	  }
	| {
			readonly kind: "new-flow";
	  };

export interface Launch {
	readonly act: LaunchAct;
	readonly label: string;
	readonly tag: string;
}

export interface PaneSpot {
	readonly flowId: string;
	readonly paneId: string;
}

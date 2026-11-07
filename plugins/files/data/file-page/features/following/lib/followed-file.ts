import type { HeldFile } from "../../../shared/schema/held-file.schema.js";

export type FollowStep =
	| {
			readonly kind: "stay";
			readonly reason: string;
	  }
	| {
			readonly kind: "move";
			readonly from: HeldFile;
			readonly to: string;
	  };

export function followStepOf(held: HeldFile | null, shown: string | null, located: string | null): FollowStep {
	if (held === null || shown !== held.path) {
		return {
			kind: "stay",
			reason: "no file of this tab was learned before the window was left",
		};
	}

	if (located === null || located === held.path) {
		return {
			kind: "stay",
			reason: located === null ? `${held.path} is gone and no file in its folder is it` : `${held.path} stays`,
		};
	}

	return {
		kind: "move",
		from: held,
		to: located,
	};
}

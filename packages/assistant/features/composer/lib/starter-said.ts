import type { Starter } from "../../../shared/schema/starter.schema.js";

const STARTER_ASKS: Readonly<Record<Starter, string>> = {
	create: "Create an app from this idea: plan it, write the code and run it.",
	design: "Design the app: draw its screens and look on the canvas, and write no code until I say build.",
};

export function withStarter(starter: Starter | null, said: string): string {
	if (starter === null) {
		return said;
	}

	return `${STARTER_ASKS[starter]}\n\n${said}`;
}

export interface ChatSkill {
	readonly name: string;
	readonly description: string;
	readonly aliases: readonly string[];
}

export const CHAT_SKILLS: readonly ChatSkill[] = [
	{
		name: "create-app",
		description: "Describe it in a sentence, Sumi writes the code and runs it",
		aliases: ["new-app"],
	},
	{
		name: "design-app",
		description: "Screens and look first, drawn on the canvas, no code yet",
		aliases: ["screens"],
	},
];

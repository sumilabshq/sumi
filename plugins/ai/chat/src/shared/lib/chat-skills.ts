export interface ChatSkill {
	readonly name: string;
	readonly description: string;
	readonly icon: string;
	readonly aliases: readonly string[];
}

export const CHAT_SKILLS: readonly ChatSkill[] = [
	{
		name: "create-app",
		description: "Describe it in a sentence, Sumi writes the code and runs it",
		icon: "code-xml",
		aliases: ["new-app"],
	},
	{
		name: "design-app",
		description: "Screens and look first, drawn on the canvas, no code yet",
		icon: "layout-panel-left",
		aliases: ["screens"],
	},
];

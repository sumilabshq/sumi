export interface MarkdownLook {
	readonly runsCode: boolean;
	readonly cutsLong: boolean;
}

export const CHAT_LOOK: MarkdownLook = {
	runsCode: true,
	cutsLong: true,
};

export const FILE_LOOK: MarkdownLook = {
	runsCode: false,
	cutsLong: false,
};

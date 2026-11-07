export interface ShownCode {
	readonly language: string;
	readonly body: string;
}

const ENV_NAME = /^\.env(\..+)?$/;
const ENV_LINE = /^(\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=\s*)(\S.*)$/;
const HIDDEN_VALUE = "••••••••";
const DOTENV = "dotenv";

export function shownCodeOf(path: string, text: string): ShownCode {
	const name = path.slice(path.lastIndexOf("/") + 1);

	if (ENV_NAME.test(name) || name.endsWith(".env")) {
		return {
			language: DOTENV,
			body: secretsHidden(text),
		};
	}

	const dot = name.lastIndexOf(".");
	return {
		language: dot > 0 ? name.slice(dot + 1).toLowerCase() : "",
		body: text,
	};
}

export function secretsHidden(text: string): string {
	return text
		.split("\n")
		.map((line) => line.replace(ENV_LINE, `$1${HIDDEN_VALUE}`))
		.join("\n");
}

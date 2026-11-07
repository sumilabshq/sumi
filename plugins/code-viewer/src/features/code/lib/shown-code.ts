export interface ShownCode {
	readonly language: string;
	readonly body: string;
}

const ENV_NAME = /^\.env(\..+)?$/;
const ENV_LINE = /^(\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=\s*)(\S.*)$/;
const HIDDEN_VALUE = "••••••••";
const DOTENV = "dotenv";

export function shownCodeOf(path: string, text: string, showsSecrets: boolean): ShownCode {
	if (hasSecretsAt(path)) {
		return {
			language: DOTENV,
			body: showsSecrets ? text : secretsHidden(text),
		};
	}

	const name = nameOf(path);
	const dot = name.lastIndexOf(".");
	return {
		language: dot > 0 ? name.slice(dot + 1).toLowerCase() : "",
		body: text,
	};
}

export function hasSecretsAt(path: string): boolean {
	const name = nameOf(path);
	return ENV_NAME.test(name) || name.endsWith(".env");
}

export function secretsHidden(text: string): string {
	return text
		.split("\n")
		.map((line) => line.replace(ENV_LINE, `$1${HIDDEN_VALUE}`))
		.join("\n");
}

function nameOf(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

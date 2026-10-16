import { parse } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";
import { VISITOR_KEYS } from "@babel/types";
import type { AST, Linter } from "eslint";
import { KEYS } from "eslint-visitor-keys";

interface Located {
	readonly start: number;
	readonly end: number;
}

interface BabelToken extends Located {
	readonly type: string | { readonly label: string };
	readonly value: unknown;
}

const WITH_JSX = /\.[jt]sx$/;
const PLUGINS: readonly ParserPlugin[] = ["estree", "typescript"];
const TOKEN_TYPES: Readonly<Record<string, string>> = {
	name: "Identifier",
	string: "String",
	num: "Numeric",
	template: "Template",
	CommentLine: "Line",
	CommentBlock: "Block",
};

export const visitorKeys: Record<string, string[]> = Object.fromEntries(
	Object.entries({ ...VISITOR_KEYS, ...KEYS }).map(([type, keys]) => [type, [...(keys ?? [])]]),
);

const NOT_A_PROGRAM = "the Widgetarium parser produced no ESTree program for {file}";

export function parseForESLint(code: string, options: { readonly filePath?: string } = {}): Linter.ESLintParseResult {
	const plugins: ParserPlugin[] = WITH_JSX.test(options.filePath ?? "") ? [...PLUGINS, "jsx"] : [...PLUGINS];
	const file = parse(code, { sourceType: "module", plugins, tokens: true, ranges: true });
	const tokens = (file.tokens ?? []).filter(isToken).filter(isNotComment).map(eslintToken);
	const comments = (file.comments ?? []).map((comment) => ({
		...comment,
		type: TOKEN_TYPES[comment.type] ?? "Block",
		range: [comment.start, comment.end],
	}));
	const program: unknown = { ...file.program, range: [0, code.length], tokens, comments };
	if (!isProgram(program)) throw new Error(NOT_A_PROGRAM.replace("{file}", options.filePath ?? ""));
	return { ast: program, visitorKeys };
}

export const parser: Linter.Parser = { meta: { name: "@widgetarium/eslint-plugin/parser" }, parseForESLint };

function isToken(token: unknown): token is BabelToken {
	return typeof token === "object" && token !== null && "start" in token && "end" in token;
}

function isNotComment(token: BabelToken): boolean {
	return token.type !== "CommentLine" && token.type !== "CommentBlock";
}

function eslintToken(token: BabelToken) {
	const label = typeof token.type === "string" ? token.type : token.type.label;
	return {
		...token,
		type: TOKEN_TYPES[label] ?? "Punctuator",
		value: String(token.value ?? label),
		range: [token.start, token.end],
	};
}

function isProgram(value: unknown): value is AST.Program {
	if (typeof value !== "object" || value === null) return false;
	return Reflect.get(value, "type") === "Program" && Array.isArray(Reflect.get(value, "tokens"));
}

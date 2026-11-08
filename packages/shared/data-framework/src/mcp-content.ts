import type { Answer } from "./answer";
import { isObject } from "./is-object";

interface TextContent {
	readonly type: "text";
	readonly text: string;
}

interface ImageContent {
	readonly type: "image";
	readonly data: string;
	readonly mimeType: "image/png";
}

type McpContent = TextContent | ImageContent;

export interface ToolResult {
	readonly content: readonly McpContent[];
	readonly isError?: true;
}

export function toolResultOf(answered: Answer<unknown>): ToolResult {
	if (!answered.ok) {
		return {
			content: [textContentOf(answered.reason)],
			isError: true,
		};
	}

	return { content: contentOf(answered.output) };
}

function contentOf(output: unknown): readonly McpContent[] {
	if (!isWithPng(output)) {
		return [textContentOf(prettyJsonOf(output))];
	}

	const { png, ...rest } = output;
	return [
		{
			type: "image",
			data: png,
			mimeType: "image/png",
		},
		textContentOf(prettyJsonOf(rest)),
	];
}

function isWithPng(output: unknown): output is Readonly<Record<string, unknown>> & { readonly png: string } {
	return isObject(output) && typeof output["png"] === "string";
}

function textContentOf(text: string): TextContent {
	return {
		type: "text",
		text,
	};
}

function prettyJsonOf(value: unknown): string {
	return JSON.stringify(value ?? null, null, "\t");
}

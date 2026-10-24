import type { Node } from "@babel/types";
import { CliRefusal } from "./cli-output.js";
import type { ChainStep } from "@widgetarium/eslint-plugin/babel-chain";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";

interface KeyOwner {
	readonly file: string;
	readonly name: string;
}

const KEY_STEP = "idempotencyKey";
const KEY_FUNCTION =
	"{file}: the idempotency key of {name} is a function a client cannot carry; write (input) => input.<field> or a template literal of input's fields";

export function refuseKeyFunction({ method, call }: ChainStep, owner: KeyOwner): void {
	const [key] = call.arguments;

	if (method !== KEY_STEP || key?.type !== "ArrowFunctionExpression" || isCarriedKey(key)) {
		return;
	}

	throw new CliRefusal(fillTemplate(KEY_FUNCTION, { file: owner.file, name: owner.name }));
}

function isCarriedKey(key: Extract<Node, { type: "ArrowFunctionExpression" }>): boolean {
	const [input] = key.params;

	if (key.params.length !== 1 || input?.type !== "Identifier") {
		return false;
	}

	const { body } = key;

	if (body.type === "TemplateLiteral") {
		return body.expressions.every((part) => isReadOf(part, input.name));
	}

	return body.type === "MemberExpression" && isReadOf(body, input.name);
}

function isReadOf(node: Node, input: string): boolean {
	if (node.type === "Identifier") {
		return node.name === input;
	}

	return node.type === "MemberExpression" && !node.computed && isReadOf(node.object, input);
}

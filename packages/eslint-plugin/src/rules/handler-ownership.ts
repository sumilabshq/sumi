import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { FEATURES, HANDLERS_FILE, domainFileOf, moduleOfDomain } from "../domain-file.js";
import { isNode } from "../guards.js";

const ID_FIELD = /^(id|invoice)$|Id$/;
const ACCESS_ONLY_GUARDS: ReadonlySet<string> = new Set(["PublicGuard", "AuthenticatedGuard", "HasPermissionGuard"]);
const CALL_FACTS: ReadonlySet<string> = new Set(["idempotencyKey", "signal", "user"]);
const HANDLER_NAME = /Handler$/;

export const handlerOwnership: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: { description: "a server handler reaches a record by id only through a guard that resolved it" },
		schema: [],
		messages: {
			unresolved:
				"{{field}} from the input reaches {{port}} with no guard resolving it: let a guard load the record, check its owner and return it, and read it from the context",
			handlerCall:
				"{{handler}}.handle(...) on the server skips its guards and its idempotency key; send the request, or move the shared work to lib/",
		},
	},
	create(context) {
		const file = domainFileOf(context.filename);
		if (file === null || file.folder !== FEATURES || file.inside.at(-1) !== HANDLERS_FILE) return {};
		if (moduleOfDomain(file.root)?.runs !== "server") return {};
		return {
			CallExpression(node) {
				const handlerCalled = handlerCalledIn(node);
				if (handlerCalled !== null)
					return context.report({ node, messageId: "handlerCall", data: { handler: handlerCalled } });
				if (isMemberCall(node, "handle") && !chainOf(node).some(isResolvingGuard))
					for (const [found, field, port] of unresolvedReads(node))
						context.report({ node: found, messageId: "unresolved", data: { field, port } });
			},
		};
	},
};

function handlerCalledIn(node: ESTree.CallExpression): string | null {
	if (!isMemberCall(node, "handle") || node.callee.type !== "MemberExpression") return null;
	const { object } = node.callee;
	return object.type === "Identifier" && HANDLER_NAME.test(object.name) ? object.name : null;
}

function chainOf(handle: ESTree.CallExpression): ESTree.CallExpression[] {
	const links: ESTree.CallExpression[] = [];
	let at: ESTree.Node = handle.callee.type === "MemberExpression" ? handle.callee.object : handle;
	while (at.type === "CallExpression" && at.callee.type === "MemberExpression") {
		links.push(at);
		at = at.callee.object;
	}
	return at.type === "CallExpression" && at.callee.type === "Identifier" && at.callee.name === "handler" ? links : [];
}

function isResolvingGuard(link: ESTree.CallExpression): boolean {
	const [step] = link.arguments;
	return isMemberCall(link, "guard") && step !== undefined && !ACCESS_ONLY_GUARDS.has(nameOf(step));
}

function unresolvedReads(handle: ESTree.CallExpression): [ESTree.Node, string, string][] {
	if (chainOf(handle).length === 0) return [];
	const [handled] = handle.arguments;
	if (handled?.type !== "ArrowFunctionExpression" && handled?.type !== "FunctionExpression") return [];
	const [input, context] = handled.params;
	const fields = keysOf(input, (key) => ID_FIELD.test(key));
	const ports = keysOf(context, (key) => !CALL_FACTS.has(key));
	const found: [ESTree.Node, string, string][] = [];
	visit(handled.body, (node) => found.push(...portReads(node, ports, fields)));
	return found;
}

function portReads(
	node: ESTree.Node,
	ports: ReadonlySet<string>,
	fields: ReadonlySet<string>,
): [ESTree.Node, string, string][] {
	if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return [];
	const port = nameOf(node.callee.object);
	if (!ports.has(port)) return [];
	return [...fieldsReadIn(node.arguments, fields)].map((field): [ESTree.Node, string, string] => [node, field, port]);
}

function keysOf(pattern: ESTree.Pattern | undefined, wanted: (key: string) => boolean): Set<string> {
	if (pattern?.type !== "ObjectPattern") return new Set();
	return new Set(
		pattern.properties.flatMap((property) =>
			property.type === "Property" && property.key.type === "Identifier" && wanted(property.key.name)
				? [property.key.name]
				: [],
		),
	);
}

function fieldsReadIn(given: readonly ESTree.Node[], fields: ReadonlySet<string>): Set<string> {
	const read = new Set<string>();
	for (const argument of given)
		visit(argument, (node) => {
			if (node.type === "Identifier" && fields.has(node.name)) read.add(node.name);
			if (node.type === "MemberExpression" && node.property.type === "Identifier" && ID_FIELD.test(node.property.name))
				if (nameOf(node.object) === "input") read.add(node.property.name);
		});
	return read;
}

function isMemberCall(node: ESTree.CallExpression, method: string): boolean {
	return (
		node.callee.type === "MemberExpression" &&
		node.callee.property.type === "Identifier" &&
		node.callee.property.name === method
	);
}

function nameOf(node: ESTree.Node): string {
	if (node.type === "Identifier") return node.name;
	if (node.type === "CallExpression") return nameOf(node.callee);
	if (node.type === "MemberExpression" && node.property.type === "Identifier") return node.property.name;
	return "";
}

function visit(node: ESTree.Node, seen: (node: ESTree.Node) => void): void {
	seen(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "parent") continue;
		for (const child of Array.isArray(value) ? value : [value]) if (isNode(child)) visit(child, seen);
	}
}

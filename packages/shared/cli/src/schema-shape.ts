import type { Node } from "@babel/types";

export interface ShapeRefs {
	readonly eager: readonly string[];
	readonly lazy: readonly string[];
}

type Refuse = (kind: string) => never;

type Walk = (node: Node, refuse: Refuse) => ShapeRefs;

const NONE: ShapeRefs = { eager: [], lazy: [] };

const LITERALS: ReadonlySet<string> = new Set([
	"StringLiteral",
	"NumericLiteral",
	"BooleanLiteral",
	"NullLiteral",
	"BigIntLiteral",
	"RegExpLiteral",
]);

const WALKS: Readonly<Record<string, Walk>> = {
	Identifier: identifierRefs,
	MemberExpression: memberRefs,
	CallExpression: callRefs,
	ArrayExpression: arrayRefs,
	ObjectExpression: objectRefs,
	SpreadElement: spreadRefs,
	TemplateLiteral: templateRefs,
	UnaryExpression: unaryRefs,
	TSAsExpression: asConstRefs,
};

export function shapeRefsOf(node: Node, refuse: Refuse): ShapeRefs {
	if (LITERALS.has(node.type)) {
		return NONE;
	}

	const walk = WALKS[node.type];

	if (walk === undefined) {
		return refuse(kindOf(node));
	}

	return walk(node, refuse);
}

function identifierRefs(node: Node): ShapeRefs {
	return node.type === "Identifier" && node.name !== "undefined" ? { eager: [node.name], lazy: [] } : NONE;
}

function memberRefs(node: Node, refuse: Refuse): ShapeRefs {
	if (node.type !== "MemberExpression" || node.computed || node.property.type !== "Identifier") {
		return refuse("a computed member");
	}

	return shapeRefsOf(node.object, refuse);
}

function callRefs(node: Node, refuse: Refuse): ShapeRefs {
	if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
		return refuse("a call of a helper");
	}

	if (isLazyCall(node)) {
		return lazyRefs(node, refuse);
	}

	return joined([shapeRefsOf(node.callee, refuse), ...node.arguments.map((argument) => shapeRefsOf(argument, refuse))]);
}

function isLazyCall(node: Extract<Node, { type: "CallExpression" }>): boolean {
	const { callee } = node;
	return (
		callee.type === "MemberExpression" &&
		callee.object.type === "Identifier" &&
		callee.property.type === "Identifier" &&
		callee.property.name === "lazy"
	);
}

function lazyRefs(node: Extract<Node, { type: "CallExpression" }>, refuse: Refuse): ShapeRefs {
	const [argument] = node.arguments;
	const isBareArrow =
		argument?.type === "ArrowFunctionExpression" &&
		argument.params.length === 0 &&
		argument.body.type !== "BlockStatement";

	if (!isBareArrow) {
		return refuse("a lazy schema doing more than () => schema");
	}

	const inner = shapeRefsOf(argument.body, refuse);
	const zod = shapeRefsOf(node.callee, refuse);
	return { eager: zod.eager, lazy: [...inner.eager, ...inner.lazy] };
}

function arrayRefs(node: Node, refuse: Refuse): ShapeRefs {
	if (node.type !== "ArrayExpression") {
		return NONE;
	}

	return joined(node.elements.map((element) => (element === null ? NONE : shapeRefsOf(element, refuse))));
}

function objectRefs(node: Node, refuse: Refuse): ShapeRefs {
	if (node.type !== "ObjectExpression") {
		return NONE;
	}

	return joined(
		node.properties.map((property) => {
			if (property.type === "SpreadElement") {
				return shapeRefsOf(property.argument, refuse);
			}

			if (property.type !== "ObjectProperty" || property.computed) {
				return refuse("a method or a computed key");
			}

			return shapeRefsOf(property.value, refuse);
		}),
	);
}

function spreadRefs(node: Node, refuse: Refuse): ShapeRefs {
	return node.type === "SpreadElement" ? shapeRefsOf(node.argument, refuse) : NONE;
}

function templateRefs(node: Node, refuse: Refuse): ShapeRefs {
	return node.type === "TemplateLiteral" && node.expressions.length > 0 ? refuse("a template with values") : NONE;
}

function unaryRefs(node: Node, refuse: Refuse): ShapeRefs {
	const isNegative =
		node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral";
	return isNegative ? NONE : refuse("a computed value");
}

function asConstRefs(node: Node, refuse: Refuse): ShapeRefs {
	const isConst =
		node.type === "TSAsExpression" &&
		node.typeAnnotation.type === "TSTypeReference" &&
		node.typeAnnotation.typeName.type === "Identifier" &&
		node.typeAnnotation.typeName.name === "const";
	return isConst ? shapeRefsOf(node.expression, refuse) : refuse("a cast");
}

function joined(all: readonly ShapeRefs[]): ShapeRefs {
	return {
		eager: all.flatMap(({ eager }) => eager),
		lazy: all.flatMap(({ lazy }) => lazy),
	};
}

function kindOf(node: Node): string {
	if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
		return "a function";
	}

	return `a ${node.type}`;
}

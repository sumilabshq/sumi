import type { Node } from "@babel/types";
import { childrenOf, isFunctionNode, isNode, isSignatureNode } from "./babel-nodes.js";

export interface NameUse {
	readonly name: string;
	readonly isType: boolean;
}

type Bound = ReadonlySet<string>;

type Walk = (node: Node, bound: Bound) => NameUse[];

const WALKS: Readonly<Record<string, Walk>> = {
	Identifier: identifierUses,
	MemberExpression: memberUses,
	OptionalMemberExpression: memberUses,
	ObjectProperty: keyedUses,
	ClassProperty: keyedUses,
	TSPropertySignature: keyedUses,
	BlockStatement: blockUses,
	VariableDeclarator: declaratorUses,
	CatchClause: catchUses,
	ForStatement: loopUses,
	ForInStatement: loopUses,
	ForOfStatement: loopUses,
	ClassDeclaration: classUses,
	ClassExpression: classUses,
	MetaProperty: noUses,
	TSTypeReference: typeReferenceUses,
	TSTypeQuery: typeQueryUses,
	TSInterfaceHeritage: heritageUses,
	TSClassImplements: heritageUses,
	TSExpressionWithTypeArguments: heritageUses,
	TSTypeParameter: typeParameterUses,
	TSMappedType: mappedTypeUses,
	TSIndexSignature: indexSignatureUses,
	TSTypePredicate: typePredicateUses,
};

export function usesOf(node: Node, bound: Bound): NameUse[] {
	if (isFunctionNode(node)) {
		return functionUses(node, bound);
	}

	if (isSignatureNode(node)) {
		return signatureUses(node, bound);
	}

	return (WALKS[node.type] ?? childUses)(node, bound);
}

function usesIn(node: Node | null | undefined, bound: Bound): NameUse[] {
	return node == null ? [] : usesOf(node, bound);
}

function noUses(): NameUse[] {
	return [];
}

function identifierUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "Identifier" || bound.has(node.name)) {
		return [];
	}

	return [
		{
			name: node.name,
			isType: false,
		},
	];
}

function typeUseOf(name: string, bound: Bound): NameUse[] {
	if (name === "" || bound.has(name)) {
		return [];
	}

	return [
		{
			name,
			isType: true,
		},
	];
}

function memberUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression") {
		return [];
	}

	return node.computed ? childUses(node, bound) : usesOf(node.object, bound);
}

function keyedUses(node: Node, bound: Bound): NameUse[] {
	if (!("computed" in node) || node.computed === true) {
		return childUses(node, bound);
	}

	return childUsesWithout(node, bound, "key");
}

function functionUses(node: Node, bound: Bound): NameUse[] {
	if (!isFunctionNode(node)) {
		return [];
	}

	const typed = withNames(bound, typeParameterNamesOf(node));
	const inner = withNames(typed, [...node.params.flatMap(namesBoundBy), ...ownNameOf(node)]);
	return [
		...computedKeyUses(node, bound),
		...node.params.flatMap((param) => patternUses(param, { outer: bound, typed })),
		...usesIn(node.returnType, typed),
		...usesOf(node.body, inner),
	];
}

function signatureUses(node: Node, bound: Bound): NameUse[] {
	if (!isSignatureNode(node)) {
		return [];
	}

	const typed = withNames(bound, typeParameterNamesOf(node));
	return [
		...computedKeyUses(node, bound),
		...node.params.flatMap((param) => patternUses(param, { outer: typed, typed })),
		...usesIn(node.returnType, typed),
	];
}

function blockUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "BlockStatement") {
		return [];
	}

	const inner = withNames(bound, node.body.flatMap(namesDeclaredBy));
	return node.body.flatMap((statement) => usesOf(statement, inner));
}

function declaratorUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "VariableDeclarator") {
		return [];
	}

	return [...patternUses(node.id, { outer: bound, typed: bound }), ...usesIn(node.init, bound)];
}

function catchUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "CatchClause") {
		return [];
	}

	const { param } = node;

	if (param == null) {
		return usesOf(node.body, bound);
	}

	return [
		...patternUses(param, { outer: bound, typed: bound }),
		...usesOf(node.body, withNames(bound, namesBoundBy(param))),
	];
}

function loopUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "ForStatement" && node.type !== "ForInStatement" && node.type !== "ForOfStatement") {
		return [];
	}

	const head = node.type === "ForStatement" ? node.init : node.left;
	const declared = head?.type === "VariableDeclaration" ? namesDeclaredBy(head) : [];
	return childUses(node, withNames(bound, declared));
}

function classUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression") {
		return [];
	}

	const inner = withNames(bound, node.id === null || node.id === undefined ? [] : [node.id.name]);
	return childUsesWithout(node, inner, "id");
}

function typeReferenceUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "TSTypeReference") {
		return [];
	}

	return [...typeUseOf(leftmostNameOf(node.typeName), bound), ...usesIn(node.typeArguments, bound)];
}

function typeQueryUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "TSTypeQuery") {
		return [];
	}

	return [...typeUseOf(leftmostNameOf(node.exprName), bound), ...usesIn(node.typeArguments, bound)];
}

function heritageUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "TSInterfaceHeritage" && node.type !== "TSClassImplements") {
		return childUses(node, bound);
	}

	return [...typeUseOf(leftmostNameOf(node.expression), bound), ...usesIn(node.typeArguments, bound)];
}

function typeParameterUses(node: Node, bound: Bound): NameUse[] {
	return childUsesWithout(node, bound, "name");
}

function mappedTypeUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "TSMappedType") {
		return [];
	}

	const inner = withNames(bound, [node.key.name]);
	return [...usesOf(node.constraint, bound), ...usesIn(node.nameType, inner), ...usesIn(node.typeAnnotation, inner)];
}

function indexSignatureUses(node: Node, bound: Bound): NameUse[] {
	if (node.type !== "TSIndexSignature") {
		return [];
	}

	return [
		...node.parameters.flatMap((parameter) => patternUses(parameter, { outer: bound, typed: bound })),
		...usesIn(node.typeAnnotation, bound),
	];
}

function typePredicateUses(node: Node, bound: Bound): NameUse[] {
	return node.type === "TSTypePredicate" ? usesIn(node.typeAnnotation, bound) : [];
}

interface PatternScopes {
	readonly outer: Bound;
	readonly typed: Bound;
}

function patternUses(node: Node, scopes: PatternScopes): NameUse[] {
	const annotation =
		"typeAnnotation" in node && isNode(node.typeAnnotation) ? usesOf(node.typeAnnotation, scopes.typed) : [];
	return [...annotation, ...patternPartUses(node, scopes)];
}

function patternPartUses(node: Node, scopes: PatternScopes): NameUse[] {
	switch (node.type) {
		case "Identifier":
			return [];
		case "AssignmentPattern":
			return [...patternUses(node.left, scopes), ...usesOf(node.right, scopes.outer)];
		case "ObjectPattern":
			return node.properties.flatMap((property) => objectPatternPartUses(property, scopes));
		case "ArrayPattern":
			return node.elements.flatMap((element) => (element === null ? [] : patternUses(element, scopes)));
		case "RestElement":
			return patternUses(node.argument, scopes);
		case "TSParameterProperty":
			return patternUses(node.parameter, scopes);
		default:
			return usesOf(node, scopes.outer);
	}
}

function objectPatternPartUses(node: Node, scopes: PatternScopes): NameUse[] {
	if (node.type !== "ObjectProperty") {
		return patternUses(node, scopes);
	}

	const key = node.computed ? usesOf(node.key, scopes.outer) : [];
	return [...key, ...patternUses(node.value, scopes)];
}

function namesBoundBy(node: Node): string[] {
	switch (node.type) {
		case "Identifier":
			return [node.name];
		case "AssignmentPattern":
			return namesBoundBy(node.left);
		case "ObjectPattern":
			return node.properties.flatMap((property) =>
				namesBoundBy(property.type === "ObjectProperty" ? property.value : property),
			);
		case "ArrayPattern":
			return node.elements.flatMap((element) => (element === null ? [] : namesBoundBy(element)));
		case "RestElement":
			return namesBoundBy(node.argument);
		case "TSParameterProperty":
			return namesBoundBy(node.parameter);
		default:
			return [];
	}
}

function namesDeclaredBy(node: Node): string[] {
	if (node.type === "VariableDeclaration") {
		return node.declarations.flatMap((declarator) => namesBoundBy(declarator.id));
	}

	if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
		return node.id === null || node.id === undefined ? [] : [node.id.name];
	}

	return [];
}

function ownNameOf(node: Node): string[] {
	return node.type === "FunctionExpression" && node.id !== null && node.id !== undefined ? [node.id.name] : [];
}

function typeParameterNamesOf(node: Node): string[] {
	if (!("typeParameters" in node) || !isNode(node.typeParameters)) {
		return [];
	}

	const declaration = node.typeParameters;
	return declaration.type === "TSTypeParameterDeclaration" ? declaration.params.map(({ name }) => name.name) : [];
}

function computedKeyUses(node: Node, bound: Bound): NameUse[] {
	if (!("computed" in node) || node.computed !== true || !("key" in node) || !isNode(node.key)) {
		return [];
	}

	return usesOf(node.key, bound);
}

function leftmostNameOf(node: Node): string {
	if (node.type === "Identifier") {
		return node.name;
	}

	if (node.type === "TSQualifiedName") {
		return leftmostNameOf(node.left);
	}

	return node.type === "MemberExpression" ? leftmostNameOf(node.object) : "";
}

function childUses(node: Node, bound: Bound): NameUse[] {
	return childrenOf(node, null).flatMap((child) => usesOf(child, bound));
}

function childUsesWithout(node: Node, bound: Bound, skipped: string): NameUse[] {
	return childrenOf(node, skipped).flatMap((child) => usesOf(child, bound));
}

function withNames(bound: Bound, names: readonly string[]): Bound {
	return names.length === 0 ? bound : new Set([...bound, ...names]);
}

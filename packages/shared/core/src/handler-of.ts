import { declarationIn } from "./gateway/declared";
import { classNameOf } from "./gateway/declaration";
import type { Declaration } from "./gateway/declaration";

const NOT_A_HANDLER = "{name} declares no query or command: extend IQuery or ICommand";

export interface DeclaredHandler {
	readonly name: string;
	readonly declaration: Declaration;
}

export function declaredHandlerOf(handler: object): DeclaredHandler {
	const handlerClass: unknown = Reflect.get(handler, "constructor");
	const name = classNameOf(handlerClass);
	const declaration = declarationIn(handlerClass);
	if (!declaration) throw new TypeError(NOT_A_HANDLER.replace("{name}", name));
	return { name, declaration };
}

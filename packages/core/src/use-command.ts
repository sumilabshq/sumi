import { useCommandOver } from "./declared-command.js";
import { useCommandHandle } from "./command-handle.js";
import { declaredHandlerOf } from "./handler-of.js";
import type { CommandContract } from "./gateway/queries";
import type { CommandHandle } from "./handle-types.js";

export type CommandHandleOf<C> = C extends CommandContract<infer In, infer Out> ? CommandHandle<In, Out> : never;

const READS_NOTHING: readonly string[] = [];

export function useCommand<C extends object>(command: C): CommandHandleOf<C>;
export function useCommand(command: object): unknown {
	const { name, declaration } = declaredHandlerOf(command);
	const drawn = useCommandOver({
		name,
		declaration,
		given: command,
		readGatewayIds: READS_NOTHING,
		handsRefusals: true,
	});
	return useCommandHandle(name, drawn);
}

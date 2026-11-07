import { Repeatable } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { FlipFileSwitchInputSchema, SwitchesSchema } from "../../shared/schema/switches.schema.js";

export const FileSwitchesQuery = query("file-switches")
	.public()
	.output(SwitchesSchema)
	.settlesNow()
	.handle((_input, { switches }) => switches.switches());

export const FlipFileSwitchCommand = command("flip-file-switch")
	.public()
	.input(FlipFileSwitchInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ name }, { switches, invalidate }) => {
		invalidate(FileSwitchesQuery);
		const was = switches.switches();
		const isOn = was.on.includes(name);
		const now = {
			...was,
			on: isOn ? was.on.filter((each) => each !== name) : [...was.on, name],
		};
		const reason = `file switch ${name} ${isOn ? "on → off" : "off → on"}`;
		switches.saveSwitches(now, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const ReloadFileCommand = command("reload-file")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { switches, invalidate }) => {
		invalidate(FileSwitchesQuery);
		const was = switches.switches();
		const reason = `file loads ${was.loads} → ${was.loads + 1} (reload)`;
		switches.saveSwitches(
			{
				...was,
				loads: was.loads + 1,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

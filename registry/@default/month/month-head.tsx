import { Button, Icon } from "widgetarium/kit";

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export function MonthHead({
	shown,
	caption,
	onShift,
}: {
	shown: Date;
	caption: string;
	onShift: (by: number) => void;
}) {
	return (
		<div className="hm-head">
			<Button shape="square" size="sm" label="Previous month" onClick={() => onShift(-1)}>
				<Icon name="chevron" size={15} className="hm-flip" />
			</Button>
			<span className="hm-mid">
				<span className="hm-title">{`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}</span>
				{caption === "" ? null : <span className="hm-note">{caption}</span>}
			</span>
			<Button shape="square" size="sm" label="Next month" onClick={() => onShift(1)}>
				<Icon name="chevron" size={15} />
			</Button>
		</div>
	);
}

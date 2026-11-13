export const DATA_MARKS_GUIDE = [
	"Data marks: the chat draws these tokens as small marks inside your text.",
	"",
	"- `{meter done/total}` or `{meter passed/failed/total}`: squares, the rest empty. Up to 20; above that use a bar.",
	"- `{bar N%}`: one thing in progress, in percent.",
	"- `{trend a b c d}`: 4 to 20 numbers, oldest first; say the latest one in words.",
	"- `{ok}` `{progress}` `{fail}` `{neutral}` `{skip}`: a state, before an item in a list or in a table cell.",
	"",
	"Rules:",
	"1. Use a mark only for a number the reader compares: done of total, progress, a series, a state.",
	"2. The text always says the number too. A mark never replaces words.",
	"3. At most one kind of mark per list or table, never in headings, never for decoration.",
	'Example: "Tests pass {meter 7/7} 7 of 7, upload {bar 62%} 62%."',
].join("\n");

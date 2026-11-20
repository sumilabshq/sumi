import type { ViewTemplate } from "@sumi/view-work/implementation";

const RECIPE = `<div class="stack wide">
	<div class="media-row">
		<a class="watch" href="https://www.youtube.com/watch?v=CEay9i_aXbI"><img class="media video" src="https://i.ytimg.com/vi/CEay9i_aXbI/hqdefault.jpg" alt=""></a>
		<div class="item">
			<span class="title">Easy fluffy pancakes</span>
			<span class="muted">Inspired Taste, video recipe</span>
			<a href="https://www.youtube.com/watch?v=CEay9i_aXbI">Watch on YouTube</a>
		</div>
	</div>
	<div class="cols">
		<div class="stack">
			<div class="section-head"><h3>Ingredients</h3><span class="count">0 of 7</span><span class="meter" data-done="0" data-total="7"></span></div>
			<ul class="checklist">
				<li>Flour, 1 1/2 cups</li>
				<li>Baking powder, 3 1/2 teaspoons</li>
				<li>Sugar, 1 tablespoon</li>
				<li>Salt, 1/4 teaspoon</li>
				<li>Milk, 1 1/4 cups</li>
				<li>Egg, 1</li>
				<li>Melted butter, 3 tablespoons</li>
			</ul>
		</div>
		<div class="stack">
			<div class="section-head"><h3>Method</h3><span class="count">0 of 6</span><span class="meter" data-done="0" data-total="6"></span></div>
			<ol class="checklist" data-walk="Cook step by step">
				<li>Whisk the flour, baking powder, sugar and salt in a large bowl.</li>
				<li>Whisk the milk, egg and melted butter in a second bowl.</li>
				<li>Pour the wet mix into the dry one and stir until just combined; a few lumps are fine.</li>
				<li>Let the batter rest for 5 minutes while the pan heats over medium heat.</li>
				<li>Butter the pan and pour a quarter cup of batter for each pancake.</li>
				<li>Flip when bubbles cover the top, about 2 minutes, then cook 1 minute more.</li>
			</ol>
		</div>
	</div>
</div>`;

const DAY_PLAN = `<ol class="timeline">
	<li><span class="when">09:00</span><h3>Breakfast at Manteigaria</h3><p class="muted">Custard tarts and coffee by the counter.</p><a href="https://maps.google.com/?q=Manteigaria+Chiado+Lisbon">On the map</a></li>
	<li><span class="when">10:00</span><h3>Tram 28 to Alfama</h3><p class="muted">Board at Martim Moniz to get a seat.</p></li>
	<li class="now"><span class="when">11:30</span><h3>Castelo de São Jorge</h3><p class="muted">Tickets 15 euros, the best view over the river.</p><a href="https://maps.google.com/?q=Castelo+de+Sao+Jorge">On the map</a></li>
	<li><span class="when">13:30</span><h3>Lunch at Time Out Market</h3><p class="muted">Many stalls under one roof.</p></li>
	<li><span class="when">16:00</span><h3>Belém Tower and the Jerónimos Monastery</h3><p class="muted">Closed on Mondays.</p><a href="https://maps.google.com/?q=Belem+Tower">On the map</a></li>
	<li><span class="when">20:00</span><h3>Dinner and fado in Bairro Alto</h3><p class="muted">Book a table a day ahead.</p></li>
</ol>`;

const PRODUCT_COMPARISON = `<div class="stack loose">
	<div class="grid three">
		<a class="item" href="https://electronics.sony.com/audio/headphones/c/all-headphones"><img class="media square" src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop" alt=""><span class="title">Sony WH-1000XM6</span><span class="muted">Sony store</span><span class="price">$449</span></a>
		<a class="item" href="https://www.apple.com/airpods-max/"><img class="media square" src="https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=400&h=400&fit=crop" alt=""><span class="title">AirPods Max</span><span class="muted">Apple store</span><span class="price">$549</span></a>
		<a class="item" href="https://www.bose.com/c/headphones"><img class="media square" src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop" alt=""><span class="title">Bose QuietComfort Ultra</span><span class="muted">Bose store</span><span class="price">$429</span></a>
	</div>
	<table>
		<thead><tr><th></th><th>Sony</th><th>AirPods Max</th><th>Bose</th></tr></thead>
		<tbody>
			<tr><td class="muted">Battery</td><td class="success">30 hours</td><td>20 hours</td><td>24 hours</td></tr>
			<tr><td class="muted">Weight</td><td class="success">250 g</td><td class="error">385 g</td><td>254 g</td></tr>
			<tr><td class="muted">Codecs</td><td>LDAC, AAC</td><td>AAC</td><td>aptX Adaptive, AAC</td></tr>
			<tr><td class="muted">Folds flat</td><td>yes</td><td class="error">no</td><td>yes</td></tr>
		</tbody>
	</table>
</div>`;

const VIDEO_PICKS = `<div class="carousel">
	<a class="item" href="https://www.youtube.com/watch?v=kqtD5dpn9C8"><img class="media video" src="https://i.ytimg.com/vi/kqtD5dpn9C8/hqdefault.jpg" alt=""><span class="title">Python for beginners in 1 hour</span><span class="muted">Programming with Mosh, 1 hour</span></a>
	<a class="item" href="https://www.youtube.com/watch?v=rfscVS0vtbw"><img class="media video" src="https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg" alt=""><span class="title">Learn Python, full course for beginners</span><span class="muted">freeCodeCamp, 4 hours</span></a>
	<a class="item" href="https://www.youtube.com/watch?v=_uQrJ0TkZlc"><img class="media video" src="https://i.ytimg.com/vi/_uQrJ0TkZlc/hqdefault.jpg" alt=""><span class="title">Python full course for beginners</span><span class="muted">Programming with Mosh, 6 hours</span></a>
	<a class="item" href="https://www.youtube.com/watch?v=8DvywoWv6fI"><img class="media video" src="https://i.ytimg.com/vi/8DvywoWv6fI/hqdefault.jpg" alt=""><span class="title">Python for Everybody, a university course</span><span class="muted">freeCodeCamp, 14 hours</span></a>
	<a class="item" href="https://www.youtube.com/watch?v=XKHEtdqhLK8"><img class="media video" src="https://i.ytimg.com/vi/XKHEtdqhLK8/hqdefault.jpg" alt=""><span class="title">Python full course</span><span class="muted">Bro Code, 12 hours</span></a>
</div>`;

const SPENDING_CHART = `<div class="tabs">
	<div class="tab-list"><button>Chart</button><button>Table</button></div>
	<div class="tab-panel">
		<div class="stack loose">
			<div class="stats">
				<div><span class="muted">Total</span><span class="stat">$4,815</span></div>
				<div><span class="muted">Monthly average</span><span class="stat">$482</span></div>
				<div><span class="muted">October</span><span class="stat">$455</span></div>
			</div>
			<table class="chart" data-kind="bar">
				<thead><tr><th></th><th>Groceries</th></tr></thead>
				<tbody>
					<tr><td>Jan</td><td>440</td></tr>
					<tr><td>Feb</td><td>465</td></tr>
					<tr><td>Mar</td><td>490</td></tr>
					<tr><td>Apr</td><td>700</td></tr>
					<tr><td>May</td><td>455</td></tr>
					<tr><td>Jun</td><td>435</td></tr>
					<tr><td>Jul</td><td>480</td></tr>
					<tr><td>Aug</td><td>465</td></tr>
					<tr><td>Sep</td><td>435</td></tr>
					<tr><td>Oct</td><td>455</td></tr>
				</tbody>
			</table>
		</div>
	</div>
	<div class="tab-panel">
		<table>
			<thead><tr><th>Month</th><th class="num">Groceries</th></tr></thead>
			<tbody>
				<tr><td>January</td><td class="num">$440</td></tr>
				<tr><td>February</td><td class="num">$465</td></tr>
				<tr><td>March</td><td class="num">$490</td></tr>
				<tr><td>April</td><td class="num">$700</td></tr>
				<tr><td>May</td><td class="num">$455</td></tr>
				<tr><td>June</td><td class="num">$435</td></tr>
				<tr><td>July</td><td class="num">$480</td></tr>
				<tr><td>August</td><td class="num">$465</td></tr>
				<tr><td>September</td><td class="num">$435</td></tr>
				<tr><td>October</td><td class="num">$455</td></tr>
			</tbody>
		</table>
	</div>
</div>`;

const PROS_CONS = `<div class="stack loose">
	<div class="grid two">
		<div class="stack">
			<h3 class="success">For</h3>
			<ul>
				<li>Figma, Adobe apps and Procreate's companions run without compromises</li>
				<li>A colour-accurate screen out of the box</li>
				<li>Silent, with up to 18 hours on battery</li>
			</ul>
		</div>
		<div class="stack">
			<h3 class="error">Against</h3>
			<ul>
				<li>20 to 30 percent more for the same speed</li>
				<li>Memory and storage cannot be upgraded later</li>
				<li>Some games and CAD apps run only on Windows</li>
			</ul>
		</div>
	</div>
	<div class="card"><p><span class="title">Worth it if</span> you plan UI or motion design and can take at least 16 GB of memory.</p></div>
</div>`;

const QUIZ = `<div class="stack loose">
	<div class="section-head"><span class="muted">Question 3 of 10</span><span class="meter" data-done="2" data-total="10"></span></div>
	<h3>What is the hybridization of the carbon atoms in ethylene?</h3>
	<ol class="choices" data-right="Correct" data-wrong="Not quite">
		<li>sp</li>
		<li data-correct>sp²</li>
		<li>sp³</li>
		<li>sp³d</li>
	</ol>
	<div class="card" data-after-answer hidden><p>The C=C double bond is one sigma and one pi bond. The pi bond needs one unhybridized p orbital, so each carbon keeps three hybrid orbitals: sp².</p></div>
</div>`;

const CHECKLIST = `<div class="stack loose">
	<div class="section-head"><span class="count">0 of 7 done</span><span class="meter" data-done="0" data-total="7"></span></div>
	<ol class="checklist">
		<li>Check that your current passport or ID is valid</li>
		<li>Fill in form DS-11 online and print it</li>
		<li>Get a passport photo, 2 by 2 inches</li>
		<li>Book an appointment at an acceptance facility</li>
		<li>Bring the form, proof of citizenship, ID and photo</li>
		<li>Pay the fees: 130 dollars plus a 35 dollar facility fee</li>
		<li>Track the status online; routine service takes 4 to 6 weeks</li>
	</ol>
	<a href="https://travel.state.gov/content/travel/en/passports.html">Passports at travel.state.gov</a>
</div>`;

const CHEATSHEET = `<div class="stack wide">
	<div class="stack">
		<h3>Undo the commit, keep the changes in the working tree</h3>
		<pre data-language="bash">git reset --soft HEAD~1</pre>
	</div>
	<div class="stack">
		<h3>Undo the commit and unstage the changes</h3>
		<pre data-language="bash">git reset HEAD~1</pre>
	</div>
	<div class="stack">
		<h3>The commit is already pushed</h3>
		<pre data-language="bash">git revert HEAD
git push</pre>
	</div>
</div>`;

export const VIEW_TEMPLATES: readonly ViewTemplate[] = [
	{
		id: "sumi-recipe",
		title: "Recipe",
		purpose: "A recipe with its video, an ingredients checklist beside a method to cook step by step",
		html: RECIPE,
	},
	{
		id: "sumi-day-plan",
		title: "Day plan",
		purpose: "A day of places and times on a timeline, each with a note and a map link",
		html: DAY_PLAN,
	},
	{
		id: "sumi-product-comparison",
		title: "Product comparison",
		purpose: "Two to four products with a photo, store and price, then their specs compared in a table",
		html: PRODUCT_COMPARISON,
	},
	{
		id: "sumi-video-picks",
		title: "Video picks",
		purpose: "Four to eight videos to browse in a carousel, each with its thumbnail, title and length",
		html: VIDEO_PICKS,
	},
	{
		id: "sumi-spending-chart",
		title: "Spending chart",
		purpose: "Numbers over time as a bar chart with key totals, and the same numbers as a table",
		html: SPENDING_CHART,
	},
	{
		id: "sumi-pros-cons",
		title: "Pros and cons",
		purpose: "A decision weighed in two lists, for and against, with a verdict",
		html: PROS_CONS,
	},
	{
		id: "sumi-quiz",
		title: "Quiz card",
		purpose: "One question at a time with numbered answers, the pick marked correct or not, and an explanation",
		html: QUIZ,
	},
	{
		id: "sumi-checklist",
		title: "Checklist",
		purpose: "A numbered how-to the person ticks off, with progress and the official link",
		html: CHECKLIST,
	},
	{
		id: "sumi-cheatsheet",
		title: "Command cheatsheet",
		purpose: "A few commands for related cases, each under a heading, as coloured code with no box",
		html: CHEATSHEET,
	},
];

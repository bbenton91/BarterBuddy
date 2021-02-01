<script lang="ts">
	import ModeSwitcher from './ModeSwitcher.svelte';
	import { ParseAmmo } from './ParseAmmo';
	import Tailwindcss from './Tailwindcss.svelte';
	import Trades from './Trades.svelte';
	import Search from './Search.svelte';
	import { listings, filteredListings } from './stores';
	export let name: string;

	export const corsRedirect = "https://cors-anywhere.herokuapp.com";
	export const gamepediaUrl = "https://escapefromtarkov.gamepedia.com";
	const baseUrl = "/escapefromtarkov.gamepedia.com";
	const ammoUrl = "/Ammunition";
	const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades"

	console.log("Test");
	// ParseAmmo.Parse(corsRedirect+baseUrl+ammoUrl);

	// This actuall works but it wants to complain
	document.body.classList = [];

	// ParseAmmo.Parse(corsRedirect + barterUrl).then(data => {$listings = data; $filteredListings = data})
</script>

<style>
	:global(body) {
		background-color: rgb(19, 19, 19);
	}

</style>

<Tailwindcss />
<!-- <ModeSwitcher /> -->

<main class="p-4 mx-auto w-5/6 text-center">
	<h1 class="uppercase text-6xl leading-normal font-thin text-svelte">Barter Buddy</h1>
	<h2 class="text-2xl leading-normal font-thin text-svelte">A Barter Searcher for Tarkov</h2>
	<br><br>
	<button class="w-40 h-14 bg-gray-700 rounded text-svelte" on:click|once={() => ParseAmmo.Parse(corsRedirect + barterUrl).then(data => {$listings = data; $filteredListings = data})}>Load Data</button>
	<!-- <button class="w-40 h-14 bg-gray-700 rounded text-svelte" on:click|once={() => ParseAmmo.Parse2(corsRedirect + barterUrl)}>Load Data2</button> -->
	<Search />
	<Trades gamepediaUrl={gamepediaUrl}/>
</main>
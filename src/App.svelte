<script lang="ts">
	import ModeSwitcher from './ModeSwitcher.svelte';
	import { ParseAmmo } from './ParseAmmo';
	import type { Trade } from './ParseAmmo';
	import Tailwindcss from './Tailwindcss.svelte';
	import Trades from './Trades.svelte';
	import Search from './Search.svelte';
	import { listings, filteredListings } from './stores';
	import { Jumper } from 'svelte-loading-spinners'

	export const corsRedirect = "https://cors-anywhere.herokuapp.com";
	export const gamepediaUrl = "https://escapefromtarkov.gamepedia.com";
	const baseUrl = "/escapefromtarkov.gamepedia.com";
	const ammoUrl = "/Ammunition";
	const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades"

	// The lifetime of cache data in seconds. 5000 seconds is about 83 minutes
	const cacheLifeTime = 60*60

	type CachedData = {
		data: string,
		cacheTime: number
	}

	// ParseAmmo.Parse(corsRedirect+baseUrl+ammoUrl);

	// This actuall works but it wants to complain
	document.body.classList = [];

	async function getData():Promise<Array<Trade>>{
		// We do this because the data from getCachedData can be large and kinda slow.
		// So this await lets the page actually load (background and stuff) and then it can load the saved data
		await new Promise(resolve => setTimeout(resolve, 300));

		// Then we try to get the cached data
		var data = getCachedData("trades", 1);

		// If our cached data is empty, fetch from the server
		if(data.length < 1){
			console.log("fetching server data");
			var response = await fetch("http://67.205.142.9:443/get-data")
			var responseText = await response.text();
			let trades:Array<Trade> = JSON.parse(responseText)
			setCachedData('trades', responseText);
			
			return trades
		}

		console.log("Fetching saved local data");
		// Otherwise return our local data
		return data;
	}

	/**
	 * Tries to get cached trades. If successful, will return an Array of Trade objects. Otherwise, an empty array is returned
	 * @param name The name of the object to retrieve
	 * @param cachelife The life of the cache. If the current time minus the stored data's life is less than this, we return empty
	 */
	function getCachedData(name:string, cachelife:number):Array<Trade>{
		var cachelife = cachelife*1000; 

		var cachedString = localStorage.getItem(name) ?? "";

		if(cachedString !== ""){
			var cachedData:CachedData = JSON.parse(cachedString);
			var trades = JSON.parse(cachedData.data);
			var expired = (Date.now()) > cachedData.cacheTime + cachelife;
			if(expired){
				localStorage.removeItem(name);
				return [];
			}
			
			return trades;
		}

		return [];
	}

	function setCachedData(name:string, data:string){
		var item:CachedData = {data:data, cacheTime: Date.now()};
		localStorage.setItem(name, JSON.stringify(item));
		console.log('data is set')
	}

	// ParseAmmo.GetBartersAndCrafts().then(data => {$listings = data; $filteredListings = data})
	var response = getData().then(data => {
		$listings = data
		$filteredListings = data
	});
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
	<!-- <button class="w-40 h-14 bg-gray-700 rounded text-svelte" on:click|once={() => ParseAmmo.Parse(barterUrl).then(data => {$listings = data; $filteredListings = data})}>Load Data</button> -->
	<!-- <button class="w-40 h-14 bg-gray-700 rounded text-svelte" on:click|once={() => ParseAmmo.Parse2(corsRedirect + barterUrl)}>Load Data2</button> -->
	<Search />
	
	{#await response}
		<div class="flex justify-center items-center h-40">
			<Jumper size="60" color="#FF3E00" unit="px" duration="1s"></Jumper>
		</div>
	{:then value} 
		<Trades gamepediaUrl={gamepediaUrl} />
	{:catch error}
		<div class="flex justify-center items-center h-40 text-red-400">
			There was a problem. Try again later.
		</div>
	{/await}

</main>
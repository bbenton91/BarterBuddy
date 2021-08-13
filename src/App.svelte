<script lang="ts">
	import Tailwindcss from './Tailwindcss.svelte';
	import Trades from './Trades.svelte';
	import Search from './Search.svelte';
	import { listings, filteredListings, itemInfo } from './stores';
	import { Jumper } from 'svelte-loading-spinners'
	import type { Trade, ItemInfo} from './Types';
	import type {emptyItem, emptyTrade, emptyItemInfo} from './Types';


	export const gamepediaUrl = "https://escapefromtarkov.gamepedia.com";
	const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades"

	// The lifetime of cache data in seconds. 60*60 = 1 hour of cache
	const cacheLifeTime = 60*60

	type CachedData = {
		data: string,
		cacheTime: number
	}

	type ResponseData = {
		trades: Array<Trade>,
		extendedInfo: Array<ItemInfo>
	}

	// ParseAmmo.Parse(corsRedirect+baseUrl+ammoUrl);

	// This actually works but it wants to complain
	// Clears all existing classes from the body
	document.body.classList = [];
	// Adds a minimum full height class to the body
	document.body.classList.add("min-h-full");

	async function getData():Promise<ResponseData>{
		// We do this because the data from getCachedData can be large and kinda slow.
		// So this await lets the page actually load (background and stuff) and then it can load the saved data
		await new Promise(resolve => setTimeout(resolve, 300));

		// Then we try to get the cached data
		var trades:Array<Trade> = getCachedData<Array<Trade>>("trades", cacheLifeTime, []);
		var info = getCachedData<Array<ItemInfo>>("extendedInfo", cacheLifeTime, []);
		let data:ResponseData = {trades: trades, extendedInfo: info};

		// If our cached data is empty, fetch from the server
		if(data.trades.length < 1){
			console.log("fetching server data");
			// var response = await fetch("https://eftbarters.link/api/get-data")
			var response = await fetch("http://localhost:443/api/get-data")
			var responseText = await response.text();
			let responseData:ResponseData = JSON.parse(responseText)
			setCachedData('trades', JSON.stringify(responseData.trades));
			setCachedData('extendedInfo', JSON.stringify(responseData.extendedInfo));
			
			return responseData
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
	function getCachedData<T>(name:string, cachelife:number, defaultValue:T):T{
		var cachelife = cachelife*1000; 

		var cachedString = localStorage.getItem(name) ?? "";

		if(cachedString !== ""){
			var cachedData:CachedData = JSON.parse(cachedString);
			var data:T = JSON.parse(cachedData.data);
			var expired = (Date.now()) > cachedData.cacheTime + cachelife;
			if(expired){
				localStorage.removeItem(name);
				return defaultValue;
			}
			
			return data;
		}

		return defaultValue;
	}

	function setCachedData(name:string, data:string){
		var item:CachedData = {data:data, cacheTime: Date.now()};
		localStorage.setItem(name, JSON.stringify(item));
		console.log('data is set')
	}

	// ParseAmmo.GetBartersAndCrafts().then(data => {$listings = data; $filteredListings = data})
	var response = getData().then(data => {
		$listings = data.trades
		$filteredListings = data.trades
		
		let map = new Map<string, ItemInfo>();
		for (let info of data.extendedInfo){
			// console.log(info.name);
			map.set(info.name, info);
		}

		// console.log(data.extendedInfo);
		// console.log(map);
		$itemInfo = map;
	});
</script>

<style>
	:global(body) {
		background-color: rgb(19, 19, 19);
	}
</style>

<Tailwindcss />
<!-- <ModeSwitcher /> -->

<main class="p-4 mx-auto w-full lg:w-5/6 text-center min-h-full">
	<h1 class="uppercase text-4xl lg:text-6xl leading-normal font-thin text-svelte">EFT Barters</h1>
	<h2 class="text-base lg:text-2xl leading-normal font-thin text-svelte mt-2 italic">An easy way to search for barters and hideout crafts in Escape from Tarkov</h2>
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
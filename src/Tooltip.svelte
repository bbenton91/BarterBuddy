<script lang="ts">
	import { currentItem, currentItemInfo } from "./stores";
	import type { ItemInfo } from "./Types";

</script>


<style>
	#tooltip{
		position: absolute;
		background-color: rgb(19, 19, 19);
		border: 1px rgba(255, 62, 0, var(--tw-text-opacity)) solid;
	}
</style>

<main id="tooltip" class="text-left p-4 mx-auto text-svelte hidden">
	<h2 class="text-xl">{$currentItemInfo.itemName} ({$currentItemInfo?.itemAbbreviation})</h2>

	{#if $currentItemInfo.questDescriptions.length > 0}
		<h2 class="text-lg mt-2">Quests</h2>
		{#each $currentItemInfo.questDescriptions as quest}
			<p class="ml-2">{quest}</p>
		{/each}
	{/if}
	
	{#if $currentItemInfo.locations.length > 0}
		<h2 class="text-lg mt-2">Locations</h2>
		{#each $currentItemInfo.locations as location}
			<p class="ml-2">{location}</p>
		{/each}
	{/if}
</main>
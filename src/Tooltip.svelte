<script lang="ts">
import { currentItem, currentItemInfo } from "./stores";

import type { ItemInfo } from "./Types";

    // export let item:Item;

</script>


<style>
	.border-color{
		border-color: rgb(44, 44, 44);
	}

	#tooltip{
		position: absolute;
		background-color: rgb(19, 19, 19);
		border: 1px rgba(255, 62, 0, var(--tw-text-opacity)) solid;
	}
</style>

<main id="tooltip" class="text-left p-4 mx-auto text-svelte hidden">
	<h2 class="text-xl">{$currentItemInfo.name} ({$currentItemInfo?.abbreviation})</h2>

	{#if $currentItemInfo.quests.length > 0}
		<h2 class="text-lg mt-2">Quests</h2>
		{#each $currentItemInfo.quests as quest}
			<p class="ml-2">{quest}</p>
		{/each}
	{/if}
	
	{#if $currentItemInfo.locations.length > 0}
		<h2 class="text-lg mt-2">Locations</h2>
		{#each $currentItemInfo.locations as location}
			<p class="ml-2">{location}</p>
		{/each}
	{/if}

	<h2 class="text-lg"></h2>
</main>
<script lang="ts">
    import { filteredListings, listings } from './stores';
    import InputItem from './InputItem.svelte'
    import Trader from './Trader.svelte';
    // import Image from "svelte-image";
    
    export let gamepediaUrl:string;
</script>

<style>
	.border-color{
		border-color: rgb(44, 44, 44);
	}
</style>

<main class="p-4 mx-auto text-center w-full lg:w-4/6 text-svelte">
    <table>
        <tbody>
            <tr>
                <th>Inputs</th>
                <th>Trader/Hideout</th>
                <th>Output</th>
            </tr>

            {#each $filteredListings as listing}
                <tr class="border-2 text-xs lg:text-base">

                    <!-- This is the input items -->
                    <td class="border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6">
                       <InputItem inputs={listing.inputs} gamepediaUrl={gamepediaUrl} />
                    </td>

                    <!-- This is the trader -->
                    <td class="border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6">
                        <Trader trader={listing.trader} gamepediaUrl={gamepediaUrl} />
                    </td> 

                    <!-- This is the output item -->
                    <td class="border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6">
                        <!-- We reuse the InputItem component by passing an array with one element in it -->
                        <InputItem inputs={[listing.output]} gamepediaUrl={gamepediaUrl} />
                    </td> 
                </tr>
            {/each}

            
        </tbody>
    </table>

    <!-- If there are no filtered listings, we want to let them know -->
    {#if $filteredListings.length == 0}
        <div class="flex justify-center">
            No results found. Try another search
        </div>
    {/if}
</main>
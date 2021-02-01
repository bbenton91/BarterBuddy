<script lang="ts">
    import { filteredListings } from './stores';
    import type { Item } from './ParseAmmo';
    import Image from "svelte-image";
    
    export let gamepediaUrl;
</script>

<style>
	.border-color{
		border-color: rgb(44, 44, 44);
	}
</style>

<main class="p-4 mx-auto text-center w-4/6">
    <table>
        <tbody>
            {#each $filteredListings as listing}
                <tr class="border-2 text-svelte">

                    <!-- This is the input items -->
                    <td class="border-2 border-color p-5 w-1/6">
                        {#each listing.inputs as inputItem}
                            <div class="flex justify-center mb-4">
                                <!-- The picture and name -->
                                <div class="flex flex-col justify-items-center">
                                    <a class="self-center" href={gamepediaUrl+inputItem.relativeHref}><img class="self-center" src={"/images"+inputItem.iconHref} alt=""></a>
                                    {inputItem.name}
                                </div>

                                <!-- The amount (on the right) -->
                                <div class="self-center ml-3">
                                    x{inputItem.amount}
                                </div>
                            </div>
                        {/each}
                    </td>

                    <!-- This is the trader -->
                    <td class="border-2 border-color p-5 w-1/6">
                        <div class="flex flex-col justify-items-center">
                            <img class="self-center" src={"/images"+listing.trader.iconHref} alt="">
                            {listing.trader.name}
                        </div>
                    </td> 

                    <!-- This is the output item -->
                    <td class="border-2 border-color p-5 w-1/6">
                        <div class="flex flex-col justify-items-center">
                            <img class="self-center" src={"/images"+listing.output.iconHref} alt="">
                            {listing.output.name}
                        </div>
                    </td> 
                </tr>
            {/each}
        </tbody>
    </table>
</main>
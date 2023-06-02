<script lang="ts">
    import { currentItem, currentItemInfo, filteredListings, listings, showingAmount } from './stores';
    import InputItem from './InputItem.svelte'
    import Trader from './Trader.svelte';
    import Tooltip from './Tooltip.svelte';
    import { emptyItem, emptyItemInfo } from './Types';
    import { empty } from 'svelte/internal';
    // import Image from "svelte-image";
    
    export let gamepediaUrl:string;

    const handleWheel = (e:UIEvent) => {
        if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 500) {
            $showingAmount = clamp($showingAmount + 25, 0, $filteredListings.length)
        }
        e.preventDefault();
    };

    function clamp(num:number, min:number, max:number):number{
        return Math.min(Math.max(num, min), max);
    }

    function startMouseMove(event:MouseEvent){
       $currentItem = emptyItem();
       $currentItemInfo = emptyItemInfo();
       document.querySelector("#tooltip")?.classList.add("hidden");
    }
</script>

<svelte:window on:scroll={handleWheel} />

<style>
	.border-color{
		border-color: rgb(44, 44, 44);
	}

    .tall{
        min-height: 1000px;
    }
</style>

<main class="p-4 mx-auto text-center w-full lg:w-4/6 text-svelte tall" on:mouseenter={startMouseMove}>
    <Tooltip />

    <!-- If there are no filtered listings, we want to let them know -->
    {#if $filteredListings.length == 0}
        <div class="flex justify-center">
            No results found. Try another search
        </div>
    {:else}
        <table id="mainTable">
            <tbody>
                <tr>
                    <th>Inputs</th>
                    <th>Trader/Hideout</th>
                    <th>Output</th>
                </tr>

                {#each {length: $showingAmount} as listing, i}
                    {#if i%10 == 0}
                        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853339352311833"
                            crossorigin="anonymous"></script>
                        <ins class="adsbygoogle"
                            style="display:block"
                            data-ad-format="fluid"
                            data-ad-layout-key="-g1+5+1+2-3"
                            data-ad-client="ca-pub-7853339352311833"
                            data-ad-slot="6570031173"></ins>
                        <script>
                            (adsbygoogle = window.adsbygoogle || []).push({});
                        </script>
                    {:else}
                        <tr class="border-2 text-xs lg:text-base">

                            <!-- This is the input items -->
                            <td class="border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6">
                            <InputItem inputs={$filteredListings[i].inputs} gamepediaUrl={gamepediaUrl} />
                            </td>

                            <!-- This is the trader -->
                            <td class="border-2 border-color p-1 lg:p-4 lg:w-1/6">
                                <Trader trader={$filteredListings[i].trader} gamepediaUrl={gamepediaUrl} />
                            </td> 

                            <!-- This is the output item -->
                            <td class="border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6">
                                <!-- We reuse the InputItem component by passing an array with one element in it -->
                                <InputItem inputs={[$filteredListings[i].output]} gamepediaUrl={gamepediaUrl} />
                            </td> 
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    {/if}

    

    
</main>
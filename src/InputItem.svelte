<script lang="ts">
import type { Item } from "./Types";


    // import Image from 'svelte-image'

    export let inputs:Item[]
    export let gamepediaUrl:string

    function setSearch(text:string){
        let input = document.querySelector("#itemSearchInput") as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event("input"));
    }
</script>

<!-- This is the input items -->
{#each inputs as inputItem}
    <div class="flex justify-center mb-2 mt-2">
        <!-- The picture and name -->
        <div class="flex flex-col justify-items-center">
            <!-- <Image src={"/images"+output.iconHref} /> -->
            <div class="flex justify-center">
                <a class="cursor-pointer self-center max-w-3 lg:max-w-lg h-auto" on:click={() => setSearch(inputItem.name)}><img class="self-center" src={"/images"+inputItem.iconHref} alt=""></a>
                <span class="self-center pl-1">x{inputItem.amount}</span>
            </div>
            <a class="cursor-pointer" on:click={()=> window.open(gamepediaUrl+inputItem.relativeHref, '_blank')}>{inputItem.name}</a>
        </div>

        <!-- The amount (on the right) -->
        <!-- <div class="self-center">
            x{inputItem.amount}
        </div> -->
    </div>
{/each}
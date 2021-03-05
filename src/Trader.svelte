<script lang="ts">
    import type { Trader } from "./Types";
    // import Image from "svelte-image";


    export let trader:Trader;
    export let gamepediaUrl:string;

    function setSearch(text:string){
        let input = document.querySelector("#itemSearchInput") as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event("input"));
    }
</script>


<div class="flex flex-col justify-items-center items-center">
    <!-- svelte-ignore a11y-missing-attribute -->
    <a class="cursor-pointer" on:click={() => setSearch(trader.name.split(" ")[0])}>
        {#if trader.iconHref != ""}
            <!-- <Image src={"/images"+trader.iconHref} alt={trader.name} width=100 height=100 /> -->
            <img class="self-center max-w-4 lg:max-w-md" src={"/images"+trader.iconHref} alt={trader.name}>
        {/if}
    </a>
    
    <span class="cursor-pointer" on:click={() => window.open(gamepediaUrl+trader.relativeHref, "_blank")}>{trader.name}</span>
</div>
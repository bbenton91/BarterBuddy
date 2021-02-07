<script lang="ts">
    import type { Trader } from "./ParseAmmo";
    // import Image from "svelte-image";


    export let trader:Trader;
    export let gamepediaUrl:string;
</script>


<div class="flex flex-col justify-items-center items-center">
    <a href={gamepediaUrl+trader.relativeHref}>
        {#if trader.iconHref != ""}
            <!-- <Image src={"/images"+trader.iconHref} alt={trader.name} width=100 height=100 /> -->
            <img class="self-center max-w-4 lg:max-w-md" src={"/images"+trader.iconHref} alt={trader.name}>
        {/if}
    </a>
    
    {trader.name}
</div>
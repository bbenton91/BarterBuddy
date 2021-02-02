<script lang="ts">
    import type { Trader } from "./ParseAmmo";


    export let trader:Trader;
    export let gamepediaUrl:string;
</script>

<div class="flex flex-col justify-items-center items-center">
    <a href={gamepediaUrl+trader.relativeHref}>
        <img class="self-center" src={"/images"+trader.iconHref} alt={trader.name}>
    </a>
    
    {trader.name}
</div>
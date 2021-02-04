<script lang="ts">
    import type { Item } from "./ParseAmmo";
    import Image from "svelte-image";


    export let output:Item;
    export let gamepediaUrl:string;
</script>

<div class="flex flex justify-center">
    <!-- The picture and name -->
    <div class="flex flex-col justify-items-center">
        <!-- <Image src={"/images"+output.iconHref} /> -->
        <div class="flex justify-center">
            <a class="self-center max-w-4 lg:max-w-sm h-auto" href={gamepediaUrl+output.relativeHref}><img class="self-center" src={"/images"+output.iconHref} alt=""></a>
            <span class="self-center pl-1">x{output.amount}</span>
        </div>
        {output.name}
    </div>

    <!-- The amount (on the right) -->
    <!-- <div class="self-center">
        x{output.amount}
    </div> -->
</div>
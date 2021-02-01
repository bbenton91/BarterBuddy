<script lang="ts">
    import type { Item } from "./ParseAmmo";


    export let output:Item;
    export let gamepediaUrl:string;
</script>

<div class="flex flex justify-center">
    <!-- The picture and name -->
    <div class="flex flex-col justify-items-center">
        <a class="self-center" href={gamepediaUrl+output.relativeHref}><img class="self-center" src={"/images"+output.iconHref} alt=""></a>
        {output.name}
    </div>

    <!-- The amount (on the right) -->
    <div class="self-center ml-3">
        x{output.amount}
    </div>
</div>
<script lang="ts">
    import type {Item} from './ParseAmmo'

    export let inputs:Item[]
    export let gamepediaUrl:string
</script>

<!-- This is the input items -->
{#each inputs as inputItem}
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
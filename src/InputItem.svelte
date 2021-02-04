<script lang="ts">
    import type {Item} from './ParseAmmo'
    // import Image from 'svelte-image'

    export let inputs:Item[]
    export let gamepediaUrl:string
</script>

<!-- This is the input items -->
{#each inputs as inputItem}
    <div class="flex justify-center mb-2 mt-2">
        <!-- The picture and name -->
        <div class="flex flex-col justify-items-center">
            <!-- <Image src={"/images"+output.iconHref} /> -->
            <div class="flex justify-center">
                <a class="self-center max-w-4 lg:max-w-sm h-auto" href={gamepediaUrl+inputItem.relativeHref}><img class="self-center" src={"/images"+inputItem.iconHref} alt=""></a>
                <span class="self-center pl-1">x{inputItem.amount}</span>
            </div>
            {inputItem.name}
        </div>

        <!-- The amount (on the right) -->
        <!-- <div class="self-center">
            x{inputItem.amount}
        </div> -->
    </div>
{/each}
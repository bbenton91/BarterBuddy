<script lang="ts">
    import type { Item } from "./Types";
    import { listings, itemInfo, currentItemInfo, currentItem } from './stores';
    import {emptyItemInfo} from "./Types";



    // import Image from 'svelte-image'

    export let inputs:Item[]
    export let gamepediaUrl:string

    let m = {x:0, y:0};
    let elem:HTMLElement;

    function setSearch(text:string){
        let input = document.querySelector("#itemSearchInput") as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event("input"));
    }

    function startMouseMove(event:MouseEvent, name:string, item:Item){
        let id = "#inputItem-"+name;
        // let element = document.querySelector(id);
        let itemName = name.split("_").join(" ");
        let storedItemInfo = $itemInfo.get(itemName) ?? emptyItemInfo();
        $currentItemInfo = storedItemInfo;
        $currentItem = item;
        
        // console.log($itemInfo)
    }

    function handleMouseLeave(event:MouseEvent){
        elem?.classList.add("hidden");
    }

    function handleMouseMove(event:MouseEvent){
        let tooltip = document.querySelector("#tooltip") as HTMLElement;
        tooltip?.classList.remove("hidden");
        tooltip.style.left = event.clientX + 20 + "px";
        tooltip.style.top = event.clientY - tooltip.offsetHeight/2 + window.pageYOffset + "px";
        elem = tooltip;
    }
</script>

<!-- This is the input items -->
{#each inputs as inputItem}
    <div class="flex justify-center mb-2 mt-2">
        <!-- The picture and name -->
        <div id={"inputItem-"+inputItem.name.split(" ").join("_")} class="flex flex-col justify-items-center" on:mousemove={handleMouseMove} on:mouseleave={handleMouseLeave} on:mouseover={(evt) => startMouseMove(evt, inputItem.name.split(" ").join("_"), inputItem)}>
            <!-- <Image src={"/images"+output.iconHref} /> -->
            <div class="flex justify-center">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="cursor-pointer self-center max-w-3 lg:max-w-lg h-auto" on:click={() => setSearch(inputItem.name)}><img class="self-center" src={"/images"+inputItem.iconHref} alt=""></a>
                <span class="self-center pl-1">x{inputItem.amount}</span>
            </div>
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="cursor-pointer" on:click={()=> window.open(gamepediaUrl+inputItem.relativeHref, '_blank')}>{inputItem.title}</a>
        </div>
    </div>
{/each}
<script lang="ts">
    import { filteredListings, listings, showingAmount } from './stores'; 

    var timeoutFunc:number;
    var searchText = "";

    function filter(text:string){
        clearTimeout(timeoutFunc);
        timeoutFunc = setTimeout(() => {
            var re = new RegExp(text, 'gmi')
            $filteredListings = $listings.filter(x => x.inputs.some(y => y.name.match(re) || x.output.name.match(re) || x.trader.name.match(re))) 
            $showingAmount = text !== "" ? $filteredListings.length : 25;
        }, 500);
    }

</script>

<style>
    .remove-focus:focus{
        outline: 0;
    }
</style>

<main>
    <div class="flex mt-5 mb-5 justify-center">
        <input id="itemSearchInput" class="text-gray-400 bg-gray-800 rounded pl-1 pr-1 pt-1 pb-1 w-full lg:w-80" type="text" bind:value={searchText} on:input={() => filter(searchText)} placeholder="Search Here">
        <button class="flex text-svelte text-center pl-2 pr-2 text-xl remove-focus" on:click={() => {searchText=""; filter("")}}>x</button>
    </div>
</main>
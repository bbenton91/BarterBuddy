<script lang="ts">
    import { filteredListings, listings } from './stores'; 

    var timeoutFunc:number;
    var searchText = "";

    function filter(text:string){
        clearTimeout(timeoutFunc);
        timeoutFunc = setTimeout(() => {
            console.log("filtering "+text)
            var re = new RegExp(text, 'gmi')
            $filteredListings = $listings.filter(x => x.inputs.some(y => y.name.match(re) || x.output.name.match(re))) 
        }, 500);
    }

</script>

<main>
    <input class="text-gray-400 bg-gray-800 rounded mt-5 mb-5 pl-1 pr-1 pt-1 pb-1 w-full lg:w-80" type="text" bind:value={searchText} on:input={() => filter(searchText)} placeholder="Search Here">
</main>
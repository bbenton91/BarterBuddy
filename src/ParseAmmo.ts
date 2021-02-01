
export type Item = {
  name: string
  amount: number
  iconHref: string
  relativeHref: string
}

export type Trader = {
  name: string
  iconHref: string
}

export type Trade = {
  inputs: Array<Item>
  trader: Trader
  output: Item
}

const corsRedirect = "https://cors-anywhere.herokuapp.com";
const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades"
const craftUrl = "/escapefromtarkov.gamepedia.com/Crafts"
const re = /\/[0-9a-zA-Z.%_-]+\.(png|gif)/gmi

export class ParseAmmo{

  static async GetBartersAndCrafts(): Promise<Array<Trade>>{
    let urls = [corsRedirect + barterUrl, corsRedirect + craftUrl]
    var trades: Array<Trade> = [];

    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];

      console.log("Starting fetch for "+url);

      const response = await fetch(url);
      var text = await response.text()

      console.log("Starting parse");

      trades = trades.concat(ParseAmmo.gatherTrades(text))

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
      
    return trades;
  }

  private static gatherTrades(textContent: string): Array<Trade> {
    
    let html = document.createElement('html');
    html.innerHTML = textContent;
    let tables = html.querySelector("#mw-content-text").querySelectorAll("table");
    var trades: Array<Trade> = [];

    // For each table we get the tbody inside.
    for (let index = 0; index < tables.length; index++) {
      const table = tables[index];
      var body = table.querySelector('tbody');

      if (body !== null) {
        var rows = body.querySelectorAll("tr");

        // If we have less than 10 rows we can just ignore the entire table.
        // The trade table has 100s of rows
        if (rows.length < 1)
          continue;

        // Then we loop over each row. Skip the first because it's a header row
        for (let index = 1; index < rows.length; index++) {
          const row = rows[index];

          // row 1,3 are simply arrows
          // row 0,2,4 are the input, trader, and output items
          var inputElem = (row.children[0] as HTMLTableColElement);
          var traderElem = (row.children[2] as HTMLTableColElement);
          var outputElem = (row.children[4] as HTMLTableColElement);

          let inputItems = ParseAmmo.parseInputItems(inputElem);
          let trader = ParseAmmo.parseTrader(traderElem);
          let outputItem = ParseAmmo.parseInputItems(outputElem)[0];

          trades.push({ inputs: inputItems, trader: trader, output: outputItem });
        }
      }
    }

    return trades;
  }

  private static parseTrader(element: HTMLTableColElement): Trader{
    var links = element.querySelectorAll("a");
    var link = Array.from(links).filter(x => x.innerText !== "")[0]
    let name = link.text;
    var src = element?.querySelector("img")?.src ?? "";
    var match = src.match(re)
    var imgName = ""
    if (match != null && match.length > 0)
      imgName = match[0]
    return { name: name, iconHref: imgName };
  }

  private static parseInputItems(element: HTMLTableColElement):Array<Item> {
    var children = Array.from(element.childNodes);
    var names = Array.from(element.querySelectorAll("a[title]")).filter(x => x.querySelector("img") !== null);

    var amounts = children
      .filter(x => x.nodeType == Node.TEXT_NODE) // Only gets text
      .filter(x => !ParseAmmo.isEmptyOrSpaces(x.textContent) && ParseAmmo.isValidInt(x.textContent.trim().slice(1))) // gets valid non-empty numbers. We do slice(1) because numbers are in the format of x1, x60, etc
      .map(x => parseInt(x.textContent.trim().slice(1)));

    var items:Array<Item> = []
    var amountIndex = 0;
    var nameIndex = 0;
    var lastName = "";

    while (nameIndex >= 0 && nameIndex < names.length) {
      var name = names[nameIndex].getAttribute("title").trim();

      if (name != lastName) {
        lastName = name
        // let re = RegExp()
        var src = names[nameIndex]?.querySelector("img")?.src ?? "";
        if (src === "") {
          console.log("src is empty for " + name)
          console.log(names[nameIndex]);
          console.log(names[nameIndex]?.querySelector("img"));
          continue;
        }
        var imgName = src.match(re)[0]
        var amount = amountIndex < amounts.length ? amounts[amountIndex] : 1
        var item: Item = { name: lastName, amount: amount, iconHref: imgName, relativeHref: names[nameIndex].getAttribute("href") }
        items.push(item);
        amountIndex++;
      }

      nameIndex++;
    }
    
    // console.log(items)

    return items;
  }

  private static isEmptyOrSpaces(str:string):boolean{
    return str === null || str.match(/^ *$/) !== null;
  }

  private static isValidInt(str: string): boolean{
    return !isNaN(parseInt(str));
  }
}
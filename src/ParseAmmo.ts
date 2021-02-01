
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

export class ParseAmmo{

  static async Parse2(url: string) {
    const response = await fetch(url);
    var text = await response.text()

    let html = document.createElement('html');
    html.innerHTML = text;

    let tables = html.querySelector("#mw-content-text").querySelectorAll("table"); // Get the tables
    let tableBodies = Array.from(tables).map(table => table.querySelector("tbody")); // Get the body from each
    let filteredBodies = Array.from(tableBodies).filter(body => body.childElementCount > 10); // Filter the bodies to make sure we get only the trades (should be 7 of them)

    console.log(filteredBodies.length)
  }

  static async Parse(url: string): Promise<Array<Trade>>{
    
    const response = await fetch(url);
    var text = await response.text()

    let html = document.createElement('html');
    html.innerHTML = text;
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
        if (rows.length < 10)
          continue;

        // Then we loop over each row. Skip the first because it's a header row
        for (let index = 1; index < rows.length; index++) {
          const row = rows[index];

          // row 1,3 are simply arrows
          // row 0,2,4 are the input, trader, and output items
          var inputElem = (row.children[0] as HTMLTableColElement);
          var traderElem = (row.children[2] as HTMLTableColElement);
          var outputElem = (row.children[4] as HTMLTableColElement);

          // console.log(inputElem);
          // console.log(inputElem.childNodes)
          // console.log(typeof (inputElem.childNodes[1]))
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
    let name = element.querySelector("a").getAttribute("title");
    let iconHref = element.querySelector("img").src

    return { name: name, iconHref: iconHref };
  }

  private static parseInputItems(element: HTMLTableColElement):Array<Item> {
    var children = Array.from(element.childNodes);
    var names = Array.from(element.querySelectorAll("a[title]"));

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
        var img = names[nameIndex]?.querySelector("img")?.src;
        var amount = amountIndex < amounts.length ? amounts[amountIndex] : 1
        var item: Item = { name: lastName, amount: amount, iconHref: img, relativeHref: names[nameIndex].getAttribute("href") }
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
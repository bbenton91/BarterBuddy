export type Item = {
  name: string
  title: string
  amount: number
  iconHref: string
  relativeHref: string
}

export type Trader = {
  name: string
  iconHref: string
  relativeHref: string
}

export type Trade = {
  inputs: Array<Item>
  trader: Trader
  output: Item
}

export type ItemInfo = {
  name: string
  quests: Array<string>
  abbreviation: string
  locations: Array<string>
  hideoutReqs: Array<string>
}

export function emptyItem(): Item {
  return { name: "", title: "", amount: -1, iconHref: "", relativeHref: "" };
}

export function emptyTrader(): Trader{
  return { name: "", iconHref: "", relativeHref: "" };
}

export function emptyItemInfo(): ItemInfo {
  return { name: "", quests: [], abbreviation: "", locations: [], hideoutReqs: [] };
}

export function emptyTrade(): Trade {
  return { inputs: [], trader: emptyTrader(), output: emptyItem()};
}

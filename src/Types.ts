export type Item = {
  name: string
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
import { writable } from 'svelte/store';
import type { ItemInfo, Trade } from './Types';

export const listings = writable<Array<Trade>>([]);
export const itemInfo = writable<Map<string, ItemInfo>>(new Map());
export const filteredListings = writable<Array<Trade>>([]);
export const showingAmount = writable<number>(25)
import { writable } from 'svelte/store';
import type { Trade } from './Types';

export const listings = writable<Array<Trade>>( [] );
export const filteredListings = writable<Array<Trade>>([]);
export const showingAmount = writable<number>(25)
import { writable } from 'svelte/store';

// undefined = not yet resolved, null = signed out, object = signed in
export const currentUser = writable(undefined);

export const txData = writable({});
export const settings = writable({});
export const loadingData = writable(true);
export const minLoadMonth = writable(null);
export const maxLoadMonth = writable(null);

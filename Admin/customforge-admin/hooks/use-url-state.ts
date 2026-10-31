"use client";
import {useSyncExternalStore} from 'react';
import type {Dispatch, SetStateAction} from 'react';
const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener('admin-query-change', notify);
  return () => {window.removeEventListener('popstate', notify); window.removeEventListener('admin-query-change', notify);};
};
// Native history is integrated by Next and preserves table state on back/forward.
export function useUrlState(key: string, initial: string): [string, Dispatch<SetStateAction<string>>];
export function useUrlState(key: string, initial: number): [number, Dispatch<SetStateAction<number>>];
export function useUrlState<T extends string | number>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const read = () => {
    const raw = new URLSearchParams(window.location.search).get(key);
    if (raw === null) return initial;
    return (typeof initial === 'number' ? (Number.isFinite(Number(raw)) && Number(raw) > 0 ? Math.floor(Number(raw)) : initial) : raw) as T;
  };
  const value = useSyncExternalStore(subscribe, read, () => initial);
  const set: Dispatch<SetStateAction<T>> = update => {
    const next = typeof update === 'function' ? update(read()) : update;
    const url = new URL(window.location.href);
    if (next === initial) url.searchParams.delete(key); else url.searchParams.set(key, String(next));
    if (key !== 'page') url.searchParams.delete('page');
    if (url.href !== window.location.href) {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new Event('admin-query-change'));
    }
  };
  return [value, set];
}

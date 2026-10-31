"use client";
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useRef} from 'react';
export function useAdminMutation() {
  const qc = useQueryClient();
  const active = useRef<Promise<unknown> | null>(null);
  const mutation = useMutation({mutationFn: (operation: () => Promise<unknown>) => operation(),
    retry: false, onSuccess: () => qc.invalidateQueries({queryKey: ['admin']})});
  return (operation: () => Promise<unknown>) => {
    if (active.current) return Promise.reject(new Error("An update is already in progress. Please wait."));
    active.current = mutation.mutateAsync(operation).finally(() => {active.current = null;});
    return active.current;
  };
}

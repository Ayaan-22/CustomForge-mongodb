"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Every results view uses the same footer, navigation and loading boundaries. */
export function Pagination({ page, pages, pending, onPage, total, pageSize, noun = "results", pageSizeControl }: {
  page: number;
  pages: number;
  pending: boolean;
  onPage: (page: number) => void;
  total?: number;
  pageSize?: number;
  noun?: string;
  pageSizeControl?: ReactNode;
}) {
  const lastPage = Math.max(1, Number.isFinite(pages) ? Math.floor(pages) : 1);
  const current = Math.min(lastPage, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  const count = total == null ? undefined : Math.max(0, Math.floor(total));
  const hasRange = count != null && pageSize != null && pageSize > 0;
  const start = hasRange && count > 0 ? (current - 1) * pageSize + 1 : 0;
  const end = hasRange ? Math.min(current * pageSize, count) : 0;
  const visiblePages = new Set([1, lastPage]);
  if (lastPage <= 7) {
    for (let number = 1; number <= lastPage; number++) visiblePages.add(number);
  } else {
    const firstNeighbor = Math.max(2, Math.min(current - 1, lastPage - 3));
    for (let number = firstNeighbor; number <= Math.min(firstNeighbor + 2, lastPage - 1); number++) visiblePages.add(number);
  }
  const numbers = [...visiblePages].sort((a, b) => a - b);
  const selectPage = (number: number) => {
    if (!pending && number >= 1 && number <= lastPage && number !== current) onPage(number);
  };

  return (
    <div className="fa-pagination" aria-busy={pending}>
      <div className="fa-pagination-summary" aria-live="polite" aria-atomic="true">
        {count != null && <span>{hasRange ? `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${count.toLocaleString()}` : count.toLocaleString()} {noun}</span>}
        <span>Page <strong>{current}</strong> of {lastPage}</span>
      </div>
      <div className="fa-pagination-actions">
        {pageSizeControl && <div className="fa-pagination-size">{pageSizeControl}</div>}
        <nav aria-label={`${noun} pages`} className="fa-pagination-controls">
          <Button type="button" variant="outline" className="fa-pagination-previous" disabled={current <= 1 || pending} onClick={() => selectPage(current - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> Previous
          </Button>
          <div className="fa-pagination-pages">
            {numbers.map((number, index) => <span className="fa-pagination-entry" key={number}>
              {index > 0 && number - numbers[index - 1] > 1 && <span className="fa-pagination-gap" aria-hidden>…</span>}
              <Button type="button" variant="outline" size="icon" aria-label={`Page ${number}`} aria-current={number === current ? "page" : undefined} disabled={pending} onClick={() => selectPage(number)}>{number}</Button>
            </span>)}
          </div>
          <Button type="button" variant="outline" className="fa-pagination-next" disabled={current >= lastPage || pending} onClick={() => selectPage(current + 1)}>
            Next <ArrowRight className="size-4" aria-hidden />
          </Button>
        </nav>
      </div>
    </div>
  );
}

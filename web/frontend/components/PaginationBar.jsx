import React from 'react';
import { Button } from '@shopify/polaris';

export function PaginationBar({ page, pageCount, onChange }) {
  const pages = paginationWindow(page, pageCount);
  return (
    <div style={s.pagination}>
      <Button onClick={() => onChange(page - 1)} disabled={page <= 1} accessibilityLabel="Previous page">‹</Button>
      {pages.map((p, i) => p === "…" ? (
        <span key={`ellipsis-${i}`} style={s.pageEllipsis}>…</span>
      ) : (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{ ...s.pageButton, ...(p === page ? s.pageButtonActive : {}) }}
        >
          {p}
        </button>
      ))}
      <Button onClick={() => onChange(page + 1)} disabled={page >= pageCount} accessibilityLabel="Next page">›</Button>
    </div>
  );
}

function paginationWindow(page, pageCount) {
  if (pageCount <= 6) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = [1, 2, 3, 4, 5];
  if (page > 5 && page < pageCount) pages.splice(4, 1, page);
  pages.push("…", pageCount);
  return Array.from(new Set(pages));
}

const s = {
  pagination: { display: "flex", alignItems: "center", gap: 4 },
  pageButton: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 4,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
    color: "#202223"
  },
  pageButtonActive: {
    background: "#f4f6f8",
    border: "1px solid #c9cccf",
    fontWeight: "bold"
  },
  pageEllipsis: { padding: "0 4px", color: "#6d7175" },
};

import { useEffect, useRef, useState } from 'react';
import type { OrderGroup, OrderRow } from '../types';
import { formatOrderRowForCopy, sortRowsForSupplierCopy } from '../utils/fabricMaterial';
import { copyToClipboard } from '../utils/copyToClipboard';
import { CollapsibleSection } from './CollapsibleSection';

const POSTING_PREVIEW_LIMIT = 3;

function PostingNumbers({ numbers }: { numbers: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (numbers.length === 0) return <span>—</span>;

  const preview = numbers.slice(0, POSTING_PREVIEW_LIMIT);
  const hiddenCount = numbers.length - POSTING_PREVIEW_LIMIT;

  return (
    <span className="posting-numbers">
      {expanded ? (
        numbers.map((number, index) => (
          <span key={`${number}-${index}`} className="posting-number-line">
            {number}
          </span>
        ))
      ) : (
        preview.join(', ')
      )}
      {!expanded && hiddenCount > 0 && (
        <button type="button" className="link-btn posting-numbers-toggle" onClick={() => setExpanded(true)}>
          ещё {hiddenCount}
        </button>
      )}
      {expanded && numbers.length > POSTING_PREVIEW_LIMIT && (
        <button type="button" className="link-btn posting-numbers-toggle" onClick={() => setExpanded(false)}>
          свернуть
        </button>
      )}
    </span>
  );
}

const COPY_SUCCESS_DURATION_MS = 2000;

async function copyGroupRows(group: OrderGroup) {
  const rows = group.copyMarketplaceArticles ? group.rows : sortRowsForSupplierCopy(group.rows);

  const text = rows
    .map((row: OrderRow) => formatOrderRowForCopy(row, group.copyMarketplaceArticles))
    .join('\n');

  await copyToClipboard(text);
}

function CopySuccessIcon() {
  return (
    <svg className="orders-copy-check" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyArticlesButton({ group }: { group: OrderGroup }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyLabel = group.copyMarketplaceArticles
    ? 'Скопировать артикулы маркетплейса'
    : 'Скопировать артикулы поставщика';

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (copied) return;

    await copyGroupRows(group);
    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopied(false), COPY_SUCCESS_DURATION_MS);
  };

  return (
    <button
      type="button"
      className={`clay-btn clay-btn-secondary orders-copy-btn${copied ? ' is-copied' : ''}`}
      disabled={copied}
      onClick={() => void handleCopy()}
    >
      <span className="orders-copy-btn-label" aria-hidden={copied}>
        {copyLabel}
      </span>
      <span className="orders-copy-btn-label orders-copy-btn-success" aria-hidden={!copied}>
        <span className="orders-copy-btn-success-inner">
          Скопировано
          <CopySuccessIcon />
        </span>
      </span>
    </button>
  );
}

type Props = {
  group: OrderGroup;
};

export function OrderSupplierGroup({ group }: Props) {
  return (
    <CollapsibleSection
      title={`${group.title} (${group.positionCount} поз., ${group.totalQuantity} шт.)`}
      defaultOpen
    >
      <div className="orders-group-actions">
        <CopyArticlesButton group={group} />
      </div>

      <div className="orders-table-wrap">
        <table className="orders-table">
          <colgroup>
            <col className="orders-col-marketplace" />
            <col className="orders-col-supplier" />
            <col className="orders-col-qty" />
            <col className="orders-col-postings" />
          </colgroup>
          <thead>
            <tr>
              <th>Артикул маркетплейса</th>
              <th>Артикул поставщика</th>
              <th>Кол-во</th>
              <th className="orders-table-postings">Номера отправлений</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.marketplaceArticle}>
                <td>
                  <div className="order-article-cell">
                    <span className="order-article-code">{row.marketplaceArticle}</span>
                    {row.productTitle && (
                      <span className="order-article-title">{row.productTitle}</span>
                    )}
                  </div>
                </td>
                <td>{row.supplierArticle ?? '—'}</td>
                <td>{row.quantity}</td>
                <td className="orders-table-postings">
                  <PostingNumbers numbers={row.postingNumbers} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

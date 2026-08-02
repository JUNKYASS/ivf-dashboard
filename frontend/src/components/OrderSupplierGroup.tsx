import { useState } from 'react';
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

async function copyGroupRows(group: OrderGroup) {
  const rows = group.copyMarketplaceArticles ? group.rows : sortRowsForSupplierCopy(group.rows);

  const text = rows
    .map((row: OrderRow) => formatOrderRowForCopy(row, group.copyMarketplaceArticles))
    .join('\n');

  await copyToClipboard(text);
}

type Props = {
  group: OrderGroup;
};

export function OrderSupplierGroup({ group }: Props) {
  const copyLabel = group.copyMarketplaceArticles
    ? 'Скопировать артикулы маркетплейса'
    : 'Скопировать артикулы поставщика';

  return (
    <CollapsibleSection
      title={`${group.title} (${group.positionCount} поз., ${group.totalQuantity} шт.)`}
      defaultOpen
    >
      <div className="orders-group-actions">
        <button type="button" className="clay-btn clay-btn-secondary" onClick={() => copyGroupRows(group)}>
          {copyLabel}
        </button>
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

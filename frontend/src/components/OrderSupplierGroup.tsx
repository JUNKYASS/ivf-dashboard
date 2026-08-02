import { useState } from 'react';
import type { OrderGroup, OrderRow } from '../types';
import { formatOrderRowForCopy, sortRowsForSupplierCopy } from '../utils/fabricMaterial';
import { CollapsibleSection } from './CollapsibleSection';

const POSTING_PREVIEW_LIMIT = 3;

function PostingNumbers({ numbers }: { numbers: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (numbers.length === 0) return <span>—</span>;

  const visible = expanded ? numbers : numbers.slice(0, POSTING_PREVIEW_LIMIT);
  const hiddenCount = numbers.length - POSTING_PREVIEW_LIMIT;

  return (
    <span className="posting-numbers">
      {visible.join(', ')}
      {!expanded && hiddenCount > 0 && (
        <>
          {' '}
          <button type="button" className="link-btn" onClick={() => setExpanded(true)}>
            ещё {hiddenCount}
          </button>
        </>
      )}
      {expanded && numbers.length > POSTING_PREVIEW_LIMIT && (
        <>
          {' '}
          <button type="button" className="link-btn" onClick={() => setExpanded(false)}>
            свернуть
          </button>
        </>
      )}
    </span>
  );
}

function copyGroupRows(group: OrderGroup) {
  const rows = group.copyMarketplaceArticles ? group.rows : sortRowsForSupplierCopy(group.rows);

  const text = rows
    .map((row: OrderRow) => formatOrderRowForCopy(row, group.copyMarketplaceArticles))
    .join('\n');

  void navigator.clipboard.writeText(text);
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
          <thead>
            <tr>
              <th>Артикул маркетплейса</th>
              <th>Артикул поставщика</th>
              <th>Кол-во</th>
              <th>Номера отправлений</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.marketplaceArticle}>
                <td>{row.marketplaceArticle}</td>
                <td>{row.supplierArticle ?? '—'}</td>
                <td>{row.quantity}</td>
                <td>
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

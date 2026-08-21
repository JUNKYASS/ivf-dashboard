import { useEffect, useRef, useState } from 'react';
import type { FabricSaleType, OrderGroup, OrderRow } from '../types';
import { formatOrderRowForCopy, sortRowsForSupplierCopy } from '../utils/fabricMaterial';
import { fabricSaleTypeLabel, splitRowsByFabricSaleType } from '../utils/fabricSaleType';
import { getFabricSplitMode } from '../utils/orderGroupLayout';
import { copyToClipboard } from '../utils/copyToClipboard';
import { getSupplierOrderQuantity } from '../utils/warehouseStock';
import { CollapsibleSection } from './CollapsibleSection';

const POSTING_PREVIEW_LIMIT = 3;
const COPY_SUCCESS_DURATION_MS = 2000;
const SUPPLIER_COPY_LABEL = 'Скопировать арт. поставщика';

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

function FabricTypeBadge({ type }: { type: FabricSaleType }) {
  return (
    <span className={`fabric-type-badge fabric-type-badge-${type}`}>
      {fabricSaleTypeLabel(type)}
    </span>
  );
}

function prepareRowsForCopy(
  rows: OrderRow[],
  warehouseStockEnabled: boolean,
  useSupplierSort: boolean,
  groupKey?: string,
): OrderRow[] {
  const prepared = rows
    .map((row) => ({
      ...row,
      quantity: warehouseStockEnabled
        ? getSupplierOrderQuantity(row.quantity, row.warehouseStock)
        : row.quantity,
    }))
    .filter((row) => row.quantity > 0);

  return useSupplierSort
    ? sortRowsForSupplierCopy(prepared, { naturalArticleSort: groupKey === 'galtex' })
    : prepared;
}

async function copyRows(
  rows: OrderRow[],
  warehouseStockEnabled: boolean,
  getCopyAsMarketplace: (row: OrderRow) => boolean,
  groupKey?: string,
): Promise<'ok' | 'empty'> {
  const useSupplierSort = rows.some((row) => !getCopyAsMarketplace(row));
  const prepared = prepareRowsForCopy(rows, warehouseStockEnabled, useSupplierSort, groupKey);

  if (prepared.length === 0) return 'empty';

  const formattedLines = prepared.map((row) => formatOrderRowForCopy(row, getCopyAsMarketplace(row)));
  const text = formattedLines.map((line) => line.text).join('\n');
  const html = formattedLines.map((line) => line.html).join('<br>');

  await copyToClipboard({ text, html });
  return 'ok';
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

function CopyRowsButton({
  label,
  rows,
  warehouseStockEnabled,
  getCopyAsMarketplace,
  groupKey,
  emptyMessage = 'Нет позиций для отгрузки у поставщика',
}: {
  label: string;
  rows: OrderRow[];
  warehouseStockEnabled: boolean;
  getCopyAsMarketplace: (row: OrderRow) => boolean;
  groupKey?: string;
  emptyMessage?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (copied) return;

    setShowEmptyMessage(false);

    const result = await copyRows(rows, warehouseStockEnabled, getCopyAsMarketplace, groupKey);
    if (result === 'empty') {
      setShowEmptyMessage(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setShowEmptyMessage(false), COPY_SUCCESS_DURATION_MS);
      return;
    }

    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopied(false), COPY_SUCCESS_DURATION_MS);
  };

  return (
    <div className="orders-copy-wrap">
      <button
        type="button"
        className={`clay-btn clay-btn-secondary orders-copy-btn${copied ? ' is-copied' : ''}`}
        disabled={copied}
        onClick={() => void handleCopy()}
      >
        <span className="orders-copy-btn-label" aria-hidden={copied}>
          {label}
        </span>
        <span className="orders-copy-btn-label orders-copy-btn-success" aria-hidden={!copied}>
          <span className="orders-copy-btn-success-inner">
            Скопировано
            <CopySuccessIcon />
          </span>
        </span>
      </button>
      {showEmptyMessage && (
        <span className="orders-copy-empty-msg" role="status" aria-live="polite">
          {emptyMessage}
        </span>
      )}
    </div>
  );
}

function OrdersTable({
  rows,
  warehouseStockEnabled,
  showBadges,
}: {
  rows: OrderRow[];
  warehouseStockEnabled: boolean;
  showBadges: boolean;
}) {
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const toggleExpanded = (article: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(article)) {
        next.delete(article);
      } else {
        next.add(article);
      }
      return next;
    });
  };

  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <colgroup>
          <col className="orders-col-marketplace" />
          <col className="orders-col-supplier" />
          <col className="orders-col-qty" />
          {warehouseStockEnabled && <col className="orders-col-warehouse" />}
          <col className="orders-col-postings" />
        </colgroup>
        <thead>
          <tr>
            <th>Артикул маркетплейса</th>
            <th>Артикул поставщика</th>
            <th>Кол-во</th>
            {warehouseStockEnabled && <th>Наш склад</th>}
            <th className="orders-table-postings">Номера отправлений</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.marketplaceArticle}>
              <td>
                <div className="order-article-cell">
                  <div className="order-article-code-row">
                    <span className="order-article-code">{row.marketplaceArticle}</span>
                    {showBadges && row.fabricSaleType && (
                      <FabricTypeBadge type={row.fabricSaleType} />
                    )}
                  </div>
                  {row.productTitle && (
                    <span className="order-article-title">{row.productTitle}</span>
                  )}
                </div>
              </td>
              <td>{row.supplierArticle ?? '—'}</td>
              <td>{row.quantity}</td>
              {warehouseStockEnabled && (
                <td className={row.warehouseStock > 0 ? 'warehouse-stock-available' : undefined}>
                  {row.warehouseStock}
                </td>
              )}
              <td className="orders-table-postings">
                <PostingNumbers numbers={row.postingNumbers} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="orders-mobile-list">
        {rows.map((row) => {
          const hasDetails =
            Boolean(row.productTitle) ||
            Boolean(row.supplierArticle) ||
            row.postingNumbers.length > 0;
          const expanded = expandedArticles.has(row.marketplaceArticle);

          return (
            <li key={row.marketplaceArticle} className="orders-mobile-card">
              <div className="orders-mobile-card-main">
                <div className="orders-mobile-article">
                  <div className="order-article-code-row">
                    <span className="order-article-code">{row.marketplaceArticle}</span>
                    {showBadges && row.fabricSaleType && (
                      <FabricTypeBadge type={row.fabricSaleType} />
                    )}
                  </div>
                </div>
                <div className="orders-mobile-qty">
                  <span className="orders-mobile-qty-value">×{row.quantity}</span>
                  {warehouseStockEnabled && (
                    <span
                      className={`orders-mobile-warehouse${row.warehouseStock > 0 ? ' warehouse-stock-available' : ''
                        }`}
                    >
                      склад {row.warehouseStock}
                    </span>
                  )}
                </div>
              </div>

              {hasDetails && (
                <>
                  <button
                    type="button"
                    className="link-btn orders-mobile-toggle"
                    onClick={() => toggleExpanded(row.marketplaceArticle)}
                  >
                    {expanded ? 'Свернуть' : 'Подробнее'}
                  </button>
                  {expanded && (
                    <div className="orders-mobile-details">
                      {row.productTitle && (
                        <div className="orders-mobile-detail">
                          <span className="orders-mobile-detail-label">Название</span>
                          <span className="orders-mobile-detail-value">{row.productTitle}</span>
                        </div>
                      )}
                      {row.supplierArticle && (
                        <div className="orders-mobile-detail">
                          <span className="orders-mobile-detail-label">Арт. поставщика</span>
                          <span className="orders-mobile-detail-value">{row.supplierArticle}</span>
                        </div>
                      )}
                      {row.postingNumbers.length > 0 && (
                        <div className="orders-mobile-detail">
                          <span className="orders-mobile-detail-label">Отправления</span>
                          <span className="orders-mobile-detail-value">
                            <PostingNumbers numbers={row.postingNumbers} />
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FabricSubsection({
  title,
  rows,
  copyLabel,
  warehouseStockEnabled,
  getCopyAsMarketplace,
  showBadges,
  groupKey,
}: {
  title: string;
  rows: OrderRow[];
  copyLabel: string;
  warehouseStockEnabled: boolean;
  getCopyAsMarketplace: (row: OrderRow) => boolean;
  showBadges: boolean;
  groupKey: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="orders-fabric-subsection">
      <div className="orders-fabric-subsection-header">
        <h4 className="orders-fabric-subsection-title">
          {title} ({rows.length} поз.)
        </h4>
        <CopyRowsButton
          label={copyLabel}
          rows={rows}
          warehouseStockEnabled={warehouseStockEnabled}
          getCopyAsMarketplace={getCopyAsMarketplace}
          groupKey={groupKey}
        />
      </div>
      <OrdersTable rows={rows} warehouseStockEnabled={warehouseStockEnabled} showBadges={showBadges} />
    </section>
  );
}

function FabricSplitGroup({
  group,
  warehouseStockEnabled,
  fabricOnly,
}: {
  group: OrderGroup;
  warehouseStockEnabled: boolean;
  fabricOnly: boolean;
}) {
  const { cuts, rolls, otherFabric, nonFabric } = splitRowsByFabricSaleType(group.rows);
  const supplierCopy = () => false;
  const marketplaceCopy = () => true;
  const unmappedFabricCopy = (row: OrderRow) => !row.supplierArticle;

  return (
    <>
      {fabricOnly && nonFabric.length > 0 && (
        <section className="orders-fabric-subsection">
          <div className="orders-fabric-subsection-header">
            <h4 className="orders-fabric-subsection-title">
              Прочие позиции ({nonFabric.length} поз.)
            </h4>
            <CopyRowsButton
              label="Скопировать арт. маркетплейса"
              rows={nonFabric}
              warehouseStockEnabled={warehouseStockEnabled}
              getCopyAsMarketplace={marketplaceCopy}
              groupKey={group.key}
            />
          </div>
          <OrdersTable
            rows={nonFabric}
            warehouseStockEnabled={warehouseStockEnabled}
            showBadges={false}
          />
        </section>
      )}

      <FabricSubsection
        title="Отрезы"
        rows={cuts}
        copyLabel={SUPPLIER_COPY_LABEL}
        warehouseStockEnabled={warehouseStockEnabled}
        getCopyAsMarketplace={fabricOnly ? unmappedFabricCopy : supplierCopy}
        showBadges
        groupKey={group.key}
      />
      <FabricSubsection
        title="Рулоны"
        rows={rolls}
        copyLabel={SUPPLIER_COPY_LABEL}
        warehouseStockEnabled={warehouseStockEnabled}
        getCopyAsMarketplace={fabricOnly ? unmappedFabricCopy : supplierCopy}
        showBadges
        groupKey={group.key}
      />
      <FabricSubsection
        title="Прочее"
        rows={otherFabric}
        copyLabel={SUPPLIER_COPY_LABEL}
        warehouseStockEnabled={warehouseStockEnabled}
        getCopyAsMarketplace={fabricOnly ? unmappedFabricCopy : supplierCopy}
        showBadges={false}
        groupKey={group.key}
      />
    </>
  );
}

function SimpleGroup({
  group,
  warehouseStockEnabled,
}: {
  group: OrderGroup;
  warehouseStockEnabled: boolean;
}) {
  return (
    <>
      <div className="orders-group-actions orders-fabric-subsection-toolbar">
        <CopyRowsButton
          label={
            group.copyMarketplaceArticles
              ? 'Скопировать арт. маркетплейса'
              : SUPPLIER_COPY_LABEL
          }
          rows={group.rows}
          warehouseStockEnabled={warehouseStockEnabled}
          getCopyAsMarketplace={() => group.copyMarketplaceArticles}
          groupKey={group.key}
        />
      </div>
      <OrdersTable rows={group.rows} warehouseStockEnabled={warehouseStockEnabled} showBadges={false} />
    </>
  );
}

type Props = {
  group: OrderGroup;
  warehouseStockEnabled: boolean;
};

export function OrderSupplierGroup({ group, warehouseStockEnabled }: Props) {
  const splitMode = getFabricSplitMode(group.key);

  return (
    <CollapsibleSection
      title={`${group.title} (${group.positionCount} поз., ${group.totalQuantity} шт.)`}
      defaultOpen
    >
      {splitMode === 'none' ? (
        <SimpleGroup group={group} warehouseStockEnabled={warehouseStockEnabled} />
      ) : (
        <FabricSplitGroup
          group={group}
          warehouseStockEnabled={warehouseStockEnabled}
          fabricOnly={splitMode === 'fabric-only'}
        />
      )}
    </CollapsibleSection>
  );
}

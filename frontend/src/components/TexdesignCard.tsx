import type { SupplierResult, SupplierStatus } from '../types';
import { StatusBadge } from './StatusBadge';

type Props = {
  url: string;
  enabled: boolean;
  result?: SupplierResult;
  generating: boolean;
  onUrlChange: (url: string) => void;
  onUrlBlur: () => void;
  onEnabledChange: (enabled: boolean) => void;
};

export function TexdesignCard({
  url,
  enabled,
  result,
  generating,
  onUrlChange,
  onUrlBlur,
  onEnabledChange,
}: Props) {
  const status: SupplierStatus = generating && enabled ? 'processing' : result?.status ?? 'pending';

  return (
    <section className={`clay-card supplier-card${enabled ? '' : ' supplier-card--disabled'}`}>
      <div className="card-header">
        <h3>ТексДизайн (TexDesign)</h3>
        <StatusBadge status={status} message={result?.message} count={result?.count} />
      </div>

      <label className="toggle-field">
        <input
          type="checkbox"
          className="toggle-input"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span className="toggle-switch" aria-hidden />
        <span className="toggle-label">Учитывать при генерации</span>
      </label>

      <div className="field">
        <label>URL XML-выгрузки</label>
        <input
          className="clay-input"
          type="url"
          value={url}
          disabled={!enabled}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onUrlBlur}
        />
      </div>
    </section>
  );
}

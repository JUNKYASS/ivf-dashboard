import type { SupplierResult, SupplierStatus } from '../types';
import { StatusBadge } from './StatusBadge';

type Props = {
  url: string;
  result?: SupplierResult;
  generating: boolean;
  onUrlChange: (url: string) => void;
  onUrlBlur: () => void;
};

export function TexdesignCard({ url, result, generating, onUrlChange, onUrlBlur }: Props) {
  const status: SupplierStatus = generating ? 'processing' : result?.status ?? 'pending';

  return (
    <section className="clay-card supplier-card">
      <div className="card-header">
        <h3>ТексДизайн (TexDesign)</h3>
        <StatusBadge status={status} message={result?.message} count={result?.count} />
      </div>

      <div className="field">
        <label>URL XML-выгрузки</label>
        <input
          className="clay-input"
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onUrlBlur}
        />
      </div>
    </section>
  );
}

import { GALTEX_MATERIALS } from '../types';
import type { GaltexSlotStatus, SupplierResult, SupplierStatus } from '../types';
import { FileUploadField } from './FileUploadField';
import { StatusBadge } from './StatusBadge';

type Props = {
  files: Record<string, File | null>;
  result?: SupplierResult;
  generating: boolean;
  onFileChange: (key: string, file: File | null) => void;
};

function slotStatus(
  key: string,
  generating: boolean,
  slots?: GaltexSlotStatus[],
): SupplierStatus {
  if (generating) return 'processing';
  const slot = slots?.find((s) => s.key === key);
  if (slot) return slot.status;
  return 'pending';
}

export function GaltexCard({ files, result, generating, onFileChange }: Props) {
  const status: SupplierStatus = generating
    ? 'processing'
    : result?.status ?? 'pending';

  return (
    <section className="section clay-card supplier-card">
      <div className="card-header">
        <h3>Galtex</h3>
        {/* <StatusBadge status={status} message={result?.message} count={result?.count} /> */}
      </div>

      <div className="galtex-slots">
        {GALTEX_MATERIALS.map((material) => {
          const file = files[material.key];
          const slot = result?.galtexSlots?.find((s) => s.key === material.key);
          const st = slotStatus(material.key, generating, result?.galtexSlots);

          return (
            <div key={material.key} className="galtex-slot">
              <div className="galtex-slot-header">
                <span className="galtex-slot-label">{material.label}</span>
                <StatusBadge status={st} message={slot?.message} count={slot?.count} />
              </div>
              <FileUploadField
                file={file ?? null}
                onChange={(f) => onFileChange(material.key, f)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

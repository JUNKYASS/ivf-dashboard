import { StatusBadge } from './StatusBadge';
import type { SupplierResult, SupplierStatus } from '../types';
import { FileUploadField } from './FileUploadField';

type Props = {
  name: string;
  fileKey: string;
  file: File | null;
  result?: SupplierResult;
  generating: boolean;
  onFileChange: (key: string, file: File | null) => void;
};

export function SupplierCard({
  name,
  fileKey,
  file,
  result,
  generating,
  onFileChange,
}: Props) {
  const status: SupplierStatus = generating
    ? 'processing'
    : result?.status ?? (file ? 'pending' : 'pending');

  return (
    <section className="clay-card supplier-card">
      <div className="card-header">
        <h3>{name}</h3>
        <StatusBadge status={status} message={result?.message} count={result?.count} />
      </div>

      <FileUploadField
        file={file}
        placeholder="Загрузить файл остатков"
        onChange={(f) => onFileChange(fileKey, f)}
      />
    </section>
  );
}

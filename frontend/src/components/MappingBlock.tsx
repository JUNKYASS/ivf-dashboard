import type { MappingFileInfo } from '../types';
import { CollapsibleSection } from './CollapsibleSection';

type Props = {
  mappingFile: MappingFileInfo;
  hasMapping: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function MappingBlock({ mappingFile, hasMapping, onUpload }: Props) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUpload(file);
    e.target.value = '';
  };

  const summary =
    hasMapping && mappingFile ? (
      <>
        <strong>{mappingFile.originalFileName}</strong>
        {' · '}
        {new Date(mappingFile.uploadedAt).toLocaleString('ru-RU')}
      </>
    ) : (
      <span className="text-warning">Файл не загружен</span>
    );

  return (
    <CollapsibleSection title="Файл соответствия артикулов (mapping)" summary={summary}>
      {hasMapping && mappingFile ? (
        <div className="clay-inset info-panel">
          <div className="info-panel-title">{mappingFile.originalFileName}</div>
          <div className="info-panel-meta">
            Загружен: {new Date(mappingFile.uploadedAt).toLocaleString('ru-RU')}
          </div>
        </div>
      ) : (
        <p className="text-warning" style={{ marginTop: 0 }}>
          Mapping-файл не загружен
        </p>
      )}
      <label className="clay-btn clay-btn-secondary" style={{ cursor: 'pointer' }}>
        Заменить файл
        <input type="file" accept=".xlsx" onChange={handleChange} hidden />
      </label>
    </CollapsibleSection>
  );
}

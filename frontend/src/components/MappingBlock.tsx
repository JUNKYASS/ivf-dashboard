import type { MappingFileInfo } from '../types';
import { FileUploadField } from './FileUploadField';
import { CollapsibleSection } from './CollapsibleSection';

type Props = {
  mappingFile: MappingFileInfo;
  hasMapping: boolean;
  file: File | null;
  uploading?: boolean;
  onFileChange: (file: File | null) => void;
};

export function MappingBlock({
  mappingFile,
  hasMapping,
  file,
  uploading = false,
  onFileChange,
}: Props) {
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
      <FileUploadField
        file={file}
        accept=".xlsx"
        placeholder="Загрузить mapping-файл"
        loadedFileName={hasMapping && mappingFile ? mappingFile.originalFileName : null}
        loadedFileMeta={
          hasMapping && mappingFile
            ? `Загружен: ${new Date(mappingFile.uploadedAt).toLocaleString('ru-RU')}`
            : null
        }
        onChange={onFileChange}
      />
      {uploading && <p className="warehouse-stock-uploading">Загрузка файла...</p>}
    </CollapsibleSection>
  );
}

import { useId, useRef, useState } from 'react';

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  placeholder?: string;
};

export function FileUploadField({
  file,
  onChange,
  accept = '.xlsx,.xls',
  placeholder = 'Загрузить файл остатков',
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handlePick = (picked: File | null) => {
    onChange(picked);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePick(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const picked = e.dataTransfer.files[0];
    if (picked) handlePick(picked);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <div className="file-upload-wrap">
      <label
        htmlFor={id}
        className={`file-upload${file ? ' has-file' : ''}${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          hidden
        />
        {file ? (
          <>
            <span className="file-upload-icon" aria-hidden>
              ✓
            </span>
            <span className="file-upload-name">{file.name}</span>
            <span className="file-upload-hint">Нажмите, чтобы заменить файл</span>
          </>
        ) : (
          <>
            <span className="file-upload-icon" aria-hidden>
              ↑
            </span>
            <span className="file-upload-label">{placeholder}</span>
            <span className="file-upload-hint">Перетащите файл или нажмите для выбора · .xlsx, .xls</span>
          </>
        )}
      </label>
      {file && (
        <button type="button" className="file-upload-clear" onClick={handleClear}>
          Убрать
        </button>
      )}
    </div>
  );
}

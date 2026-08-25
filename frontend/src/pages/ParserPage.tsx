import { api, triggerDownload } from '../api/client';
import { GaltexCard } from '../components/GaltexCard';
import { SupplierCard } from '../components/SupplierCard';
import { TexdesignCard } from '../components/TexdesignCard';
import type { AppConfig, GenerateResponse, SupplierResult } from '../types';
import { FILE_SUPPLIERS, GALTEX_MATERIALS } from '../types';
import { useCallback, useEffect, useState } from 'react';

export function ParserPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [texdesignUrl, setTexdesignUrl] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, SupplierResult>>({});
  const [hasOutput, setHasOutput] = useState({ ozon: false, wb: false });
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const data = await api.getConfig();
    setConfig(data);
    setTexdesignUrl(data.texdesignUrl);
    setHasOutput(data.hasOutput);
  }, []);

  useEffect(() => {
    void loadConfig().catch((err: Error) => setError(err.message));
  }, [loadConfig]);

  const handleTexdesignUrlBlur = async () => {
    if (!config || texdesignUrl === config.texdesignUrl) return;
    const data = await api.saveTexdesignUrl(texdesignUrl);
    setConfig(data);
  };

  const handleFileChange = (key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setResults((prev) => {
      const next = { ...prev };
      delete next[key === 'galtex' ? 'galtex' : key];
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResults({});

    const processingState: Record<string, SupplierResult> = {};
    if (GALTEX_MATERIALS.some((m) => files[m.key])) {
      processingState.galtex = { status: 'processing' };
    }
    if (texdesignUrl.trim()) {
      processingState.td = { status: 'processing' };
    }
    for (const supplier of FILE_SUPPLIERS) {
      if (files[supplier.fileKey]) {
        processingState[supplier.id] = { status: 'processing' };
      }
    }
    setResults(processingState);

    try {
      const formData = new FormData();
      for (const material of GALTEX_MATERIALS) {
        const file = files[material.key];
        if (file) formData.append(material.key, file);
      }
      for (const supplier of FILE_SUPPLIERS) {
        const file = files[supplier.fileKey];
        if (file) formData.append(supplier.fileKey, file);
      }

      const response: GenerateResponse = await api.generate(formData);
      setResults(response.suppliers);

      // if (response.files.ozon) {
      //   setHasOutput({ ozon: true, wb: Boolean(response.files.wb) });
      //   triggerDownload(api.downloadUrl('ozon'), 'ozon-stocks.xlsx');
      //   if (response.files.wb) {
      //     setTimeout(() => triggerDownload(api.downloadUrl('wb'), 'wb-stocks.xlsx'), 400);
      //   }
      // }

      if (response.files.ozon) {
        setHasOutput({ ozon: true, wb: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  if (!config) {
    return (
      <div>
        <h1 className="page-title">Парсер остатков</h1>
        {error ? <p className="text-error">{error}</p> : <div className="spinner" />}
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Парсер остатков</h1>

      <GaltexCard
        files={files}
        result={results.galtex}
        generating={generating}
        onFileChange={handleFileChange}
      />

      <div className="suppliers-grid">
        {FILE_SUPPLIERS.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            name={supplier.name}
            fileKey={supplier.fileKey}
            file={files[supplier.fileKey] ?? null}
            result={results[supplier.id]}
            generating={generating}
            onFileChange={handleFileChange}
          />
        ))}

        <TexdesignCard
          url={texdesignUrl}
          result={results.td}
          generating={generating}
          onUrlChange={setTexdesignUrl}
          onUrlBlur={() => void handleTexdesignUrlBlur()}
        />
      </div>

      <section className="section clay-card generate-block">
        <button className="clay-btn" onClick={() => void handleGenerate()} disabled={generating}>
          {generating ? (
            <span className="loading-row">
              <span className="spinner" /> Генерация...
            </span>
          ) : (
            'Сгенерировать файлы остатков'
          )}
        </button>

        {hasOutput.ozon && (
          <div className="download-links">
            <a href={api.downloadUrl('ozon')}>Скачать ozon-stocks.xlsx</a>
            {hasOutput.wb && <a href={api.downloadUrl('wb')}>Скачать wb-stocks.xlsx</a>}
          </div>
        )}

        {error && <span className="text-error">{error}</span>}
      </section>
    </div>
  );
}

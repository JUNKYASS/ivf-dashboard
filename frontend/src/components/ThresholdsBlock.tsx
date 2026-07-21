import type { ThresholdValue } from '../types';
import { THRESHOLD_SUPPLIERS } from '../types';
import { CollapsibleSection } from './CollapsibleSection';

type Props = {
  thresholds: Record<string, ThresholdValue>;
  galtexThreshold: ThresholdValue;
  onSave: (key: string, threshold: number, remain: number) => Promise<void>;
};

function ThresholdFields({
  label,
  configKey,
  value,
  onSave,
}: {
  label: string;
  configKey: string;
  value: ThresholdValue;
  onSave: Props['onSave'];
}) {
  const handleBlur = (field: 'threshold' | 'remain', raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const next = { ...value, [field]: num };
    void onSave(configKey, next.threshold, next.remain);
  };

  return (
    <div className="threshold-item clay-inset">
      <h3>{label}</h3>
      <div className="field">
        <label>Порог остатка</label>
        <input
          className="clay-input"
          type="number"
          defaultValue={value.threshold}
          onBlur={(e) => handleBlur('threshold', e.target.value)}
        />
      </div>
      <div className="field">
        <label>Устанавливаемый остаток</label>
        <input
          className="clay-input"
          type="number"
          defaultValue={value.remain}
          onBlur={(e) => handleBlur('remain', e.target.value)}
        />
      </div>
    </div>
  );
}

export function ThresholdsBlock({ thresholds, galtexThreshold, onSave }: Props) {
  return (
    <CollapsibleSection
      title="Пороговые значения по поставщикам"
      summary={`${THRESHOLD_SUPPLIERS.length} поставщиков`}
    >
      <div className="threshold-grid">
        {THRESHOLD_SUPPLIERS.map((supplier) => (
          <ThresholdFields
            key={supplier.key}
            label={supplier.label}
            configKey={supplier.key}
            value={supplier.key === 'galtex' ? galtexThreshold : thresholds[supplier.key]}
            onSave={onSave}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

import type { SupplierStatus } from '../types';

const labels: Record<SupplierStatus, string> = {
  pending: 'Ожидание',
  skipped: 'Пропущен',
  processing: 'Обработка...',
  success: 'Успешно',
  error: 'Ошибка',
};

type Props = {
  status: SupplierStatus;
  message?: string;
  count?: number;
};

export function StatusBadge({ status, message, count }: Props) {
  const text =
    status === 'success' && count !== undefined
      ? `${labels[status]} (${count} поз.)`
      : status === 'error' && message
        ? `${labels[status]}: ${message}`
        : status === 'skipped' && message
          ? `${labels[status]} — ${message}`
          : labels[status];

  return <span className={`status status-${status}`}>{text}</span>;
}

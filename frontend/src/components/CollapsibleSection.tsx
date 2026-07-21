import { useState, type ReactNode } from 'react';

type Props = {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({ title, summary, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`section clay-card collapsible-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2>{title}</h2>
        <span className="collapsible-chevron" aria-hidden />
      </button>

      {!open && summary != null && <div className="collapsible-summary">{summary}</div>}

      {open && <div className="collapsible-content">{children}</div>}
    </section>
  );
}

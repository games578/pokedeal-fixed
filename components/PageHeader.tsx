export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
      <div>
        <h1 className="font-display text-xl font-700 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

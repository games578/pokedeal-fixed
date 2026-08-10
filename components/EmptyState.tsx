export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
      <h3 className="font-display text-base font-600">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-muted">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

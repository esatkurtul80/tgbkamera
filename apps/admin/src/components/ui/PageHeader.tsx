import Link from "next/link";

interface PageHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function PageHeader({ title, actionLabel, actionHref, onAction }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

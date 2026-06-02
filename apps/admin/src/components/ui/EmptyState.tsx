import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
  );
}

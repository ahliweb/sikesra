
import { useTranslation } from 'react-i18next';
import { FileText, Layers, ShoppingBag, Users, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCards({ data, loading, className = '' }) {
  const { t } = useTranslation();
  const stats = [
    {
      title: t('dashboard.total_blogs'),
      value: data?.blogs,
      icon: FileText,
      accent: "bg-blue-500",
      iconWrapper: "bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
    },
    {
      title: t('dashboard.total_pages'),
      value: data?.pages,
      icon: Layers,
      accent: "bg-purple-500",
      iconWrapper: "bg-purple-100/80 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200",
    },
    {
      title: t('dashboard.products'),
      value: data?.products,
      icon: ShoppingBag,
      accent: "bg-orange-500",
      iconWrapper: "bg-orange-100/80 text-orange-600 dark:bg-orange-500/20 dark:text-orange-200",
    },
    {
      title: t('dashboard.active_users'),
      value: data?.users,
      icon: Users,
      accent: "bg-emerald-500",
      iconWrapper: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
    },
    {
      title: t('dashboard.total_orders'),
      value: data?.orders,
      icon: ShoppingBag,
      accent: "bg-teal-500",
      iconWrapper: "bg-teal-100/80 text-teal-600 dark:bg-teal-500/20 dark:text-teal-200",
    },
    {
      title: t('dashboard.storage_used'),
      value: data?.storage,
      icon: HardDrive,
      accent: "bg-slate-500",
      iconWrapper: "bg-slate-200/80 text-slate-600 dark:bg-slate-700/40 dark:text-slate-200",
    }
  ];

  if (loading) {
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="dashboard-surface dashboard-surface-hover overflow-hidden">
            <div className="h-1 w-full bg-slate-200/60 dark:bg-slate-700/60" />
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100/80 px-6 pt-4 pb-3 dark:border-slate-700/60">
              <Skeleton className="h-3 w-24 bg-slate-200/60 dark:bg-slate-700/60" />
              <Skeleton className="h-9 w-9 rounded-xl bg-slate-200/60 dark:bg-slate-700/60" />
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-4">
              <Skeleton className="h-7 w-16 bg-slate-200/60 dark:bg-slate-700/60" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 ${className}`}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const value = stat.value ?? 0;
          return (
            <Card
              key={index}
              className="dashboard-surface dashboard-surface-hover overflow-hidden"
            >
            <div className={`h-1 w-full ${stat.accent}`} />
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100/80 px-6 pt-4 pb-3 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {stat.title}
              </span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconWrapper}`}>
                <Icon className="h-4 w-4" />
              </span>
            </CardHeader>

            <CardContent className="px-6 pb-5 pt-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

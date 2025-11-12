import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  trend,
  trendValue,
  trendLabel,
  icon: Icon,
  iconColor = 'text-primary',
  loading = false,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-bold">
              {value}
            </div>
            {trend && trendValue && (
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon()}
                <span className={cn('text-sm font-medium', getTrendColor())}>
                  {trendValue}
                </span>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

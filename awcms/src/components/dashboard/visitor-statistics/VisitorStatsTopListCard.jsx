import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VisitorStatsTopListCard({
  title,
  description,
  items,
  emptyLabel,
  suffix,
  formatNumber,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{formatNumber(item.count)}{suffix}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default VisitorStatsTopListCard;

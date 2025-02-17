import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, value, icon, className }: DashboardCardProps) {
  return (
    <Card className={cn("transition-all hover:shadow-md p-2 sm:p-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-3 w-3 sm:h-4 sm:w-4">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

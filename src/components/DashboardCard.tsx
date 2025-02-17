// DashboardCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  isPositive?: boolean; // true para receitas, false para despesas
  className?: string;
}

export function DashboardCard({ title, value, isPositive = true, className }: DashboardCardProps) {
  const backgroundColor = isPositive ? "bg-green-500" : "bg-red-500";
  const textColor = isPositive ? "text-green-500" : "text-red-500";
  const arrowIcon = isPositive ? <ArrowUp /> : <ArrowDown />;

  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition duration-300", className)}>
      <div className={`${backgroundColor} text-white rounded-full p-2 flex items-center justify-center`}>
        {arrowIcon}
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${textColor}`}>{title}</span>
        <span className={`font-bold ${textColor}`}>
          R$ {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

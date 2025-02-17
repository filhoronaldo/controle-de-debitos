// CompactDashboardCard.tsx

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface CompactDashboardCardProps {
  title: string;
  value: number | string;
  isPositive?: boolean; // true para receitas, false para despesas
}

const CompactDashboardCard = ({ title, value, isPositive = true }: CompactDashboardCardProps) => {
  const [hovered, setHovered] = useState(false);

  const backgroundColor = isPositive ? "bg-green-500" : "bg-red-500";
  const textColor = isPositive ? "text-green-500" : "text-red-500";
  const arrowIcon = isPositive ? <ArrowUp /> : <ArrowDown />;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition duration-300`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`${backgroundColor} text-white rounded-full p-2 flex items-center justify-center`}
      >
        {arrowIcon}
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${hovered ? textColor : 'text-black'}`}>{title}</span>
        <span className={`font-bold ${hovered ? textColor : 'text-black'}`}>
          R$ {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
};

export default CompactDashboardCard;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  description?: string;
  isLoading?: boolean;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  showMiniChart?: boolean;
  miniChartData?: number[];
  onClick?: () => void;
}

const formatNumber = (value: number | string): string => {
  if (typeof value === "string") return value;
  
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toString();
};

const AnimatedNumber: React.FC<{ 
  value: number | string; 
  duration?: number;
  formatter?: (value: number) => string;
}> = ({ value, duration = 1000, formatter = (v) => v.toString() }) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const finalValue = typeof value === "number" ? value : parseFloat(value.toString()) || 0;

  useEffect(() => {
    if (typeof value !== "number") return;
    
    const startValue = 0;
    const difference = finalValue - startValue;
    const increment = difference / (duration / 16);
    
    let currentValue = startValue;
    const timer = setInterval(() => {
      currentValue += increment;
      if (
        (increment > 0 && currentValue >= finalValue) ||
        (increment < 0 && currentValue <= finalValue)
      ) {
        setDisplayValue(finalValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(currentValue));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, finalValue, duration]);

  if (typeof value === "string") {
    return <span>{value}</span>;
  }

  return <span>{formatter(displayValue)}</span>;
};

const MiniChart: React.FC<{ data: number[]; variant: string }> = ({ 
  data, 
  variant 
}) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - minValue) / range) * 15;
    return `${x},${y}`;
  }).join(' ');

  const getStrokeColor = () => {
    switch (variant) {
      case "success": return "#10b981";
      case "warning": return "#f59e0b";
      case "error": return "#ef4444";
      case "info": return "#3b82f6";
      default: return "#6366f1";
    }
  };

  return (
    <div className="absolute bottom-0 right-0 opacity-20">
      <svg width="60" height="20" viewBox="0 0 60 20">
        <polyline
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    </div>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  title,
  value,
  unit = "",
  trend,
  description,
  isLoading = false,
  className,
  variant = "default",
  showMiniChart = false,
  miniChartData = [],
  onClick
}) => {
  const variantStyles = {
    default: "border-border bg-card hover:shadow-lg",
    success: "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-green-100 hover:shadow-lg",
    warning: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-orange-100 hover:shadow-lg",
    error: "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-red-100 hover:shadow-lg",
    info: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-blue-100 hover:shadow-lg"
  };

  const iconVariantStyles = {
    default: "text-muted-foreground",
    success: "text-green-600",
    warning: "text-orange-600", 
    error: "text-red-600",
    info: "text-blue-600"
  };

  const trendVariantStyles = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50"
  };

  if (isLoading) {
    return (
      <Card className={cn(variantStyles.default, "relative overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        variantStyles[variant],
        "relative overflow-hidden transition-all duration-300 hover:scale-105 group",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-5 w-5", iconVariantStyles[variant])} />
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-baseline space-x-1">
          <div className="text-3xl font-bold tracking-tight">
            <AnimatedNumber 
              value={value} 
              formatter={formatNumber}
            />
          </div>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center mt-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5",
                trendVariantStyles[trend.isPositive ? "positive" : "negative"]
              )}
            >
              <span className="mr-1">
                {trend.isPositive ? "↗" : "↘"}
              </span>
              {Math.abs(trend.value)}%
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              {trend.period}
            </span>
          </div>
        )}
        
        {description && !trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        
        {/* 迷你圖表 */}
        {showMiniChart && miniChartData.length > 0 && (
          <MiniChart data={miniChartData} variant={variant} />
        )}
        
        {/* 玻璃擬態光暈效果 */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* 邊框發光效果 */}
        <div className="absolute inset-0 rounded-lg ring-1 ring-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </CardContent>
    </Card>
  );
};

export default MetricCard;
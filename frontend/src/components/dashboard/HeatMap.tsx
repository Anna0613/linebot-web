import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeatMapData {
  hour: number;
  day: number; // 0 = 星期日, 1 = 星期一, ... 6 = 星期六
  value: number;
  label?: string;
}

interface HeatMapProps {
  data: HeatMapData[];
  title?: string;
  isLoading?: boolean;
  className?: string;
  showLegend?: boolean;
  colorScheme?: "blue" | "green" | "purple" | "orange";
  maxValue?: number;
  cellSize?: number;
  cellGap?: number;
}

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const hourLabels = Array.from({ length: 24 }, (_, i) => 
  i.toString().padStart(2, '0')
);

const colorSchemes = {
  blue: {
    0: "bg-blue-50",
    1: "bg-blue-100", 
    2: "bg-blue-200",
    3: "bg-blue-300",
    4: "bg-blue-400",
    5: "bg-blue-500"
  },
  green: {
    0: "bg-green-50",
    1: "bg-green-100",
    2: "bg-green-200", 
    3: "bg-green-300",
    4: "bg-green-400",
    5: "bg-green-500"
  },
  purple: {
    0: "bg-purple-50",
    1: "bg-purple-100",
    2: "bg-purple-200",
    3: "bg-purple-300", 
    4: "bg-purple-400",
    5: "bg-purple-500"
  },
  orange: {
    0: "bg-orange-50",
    1: "bg-orange-100",
    2: "bg-orange-200",
    3: "bg-orange-300",
    4: "bg-orange-400", 
    5: "bg-orange-500"
  }
};

const Legend: React.FC<{ 
  colorScheme: keyof typeof colorSchemes;
  maxValue: number;
}> = ({ colorScheme }) => {
  const scheme = colorSchemes[colorScheme];
  
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>較少</span>
      <div className="flex items-center space-x-1">
        {Object.entries(scheme).map(([level, className]) => (
          <div
            key={level}
            className={cn(
              "w-3 h-3 rounded-sm border border-border",
              className
            )}
            title={`等級 ${level}`}
          />
        ))}
      </div>
      <span>較多</span>
    </div>
  );
};

const getIntensity = (value: number, maxValue: number): number => {
  if (value === 0) return 0;
  const percentage = value / maxValue;
  
  if (percentage <= 0.2) return 1;
  if (percentage <= 0.4) return 2;
  if (percentage <= 0.6) return 3;
  if (percentage <= 0.8) return 4;
  return 5;
};

const formatTime = (hour: number): string => {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
};

const HeatMapSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="grid grid-cols-25 gap-1">
      {Array.from({ length: 7 * 24 }, (_, i) => (
        <Skeleton key={i} className="w-4 h-4 rounded-sm" />
      ))}
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-3 w-16" />
      <div className="flex space-x-1">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="w-3 h-3 rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

const HeatMap: React.FC<HeatMapProps> = ({
  data,
  title = "用戶活躍度熱力圖",
  isLoading = false,
  className,
  showLegend = true,
  colorScheme = "blue",
  maxValue,
  cellSize = 16,
  cellGap: _cellGap = 2
}) => {
  const processedData = useMemo(() => {
    // 創建 7x24 的網格 (7天 x 24小時)
    const grid: (HeatMapData | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => null)
    );
    
    // 填入數據
    data.forEach(item => {
      if (item.day >= 0 && item.day <= 6 && item.hour >= 0 && item.hour <= 23) {
        grid[item.day][item.hour] = item;
      }
    });
    
    return grid;
  }, [data]);

  const calculatedMaxValue = useMemo(() => {
    if (maxValue !== undefined) return maxValue;
    return Math.max(...data.map(d => d.value), 1);
  }, [data, maxValue]);

  const stats = useMemo(() => {
    if (data.length === 0) return { total: 0, average: 0, peak: { hour: 0, day: 0, value: 0 } };
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const average = total / data.length;
    const peak = data.reduce((max, item) => 
      item.value > max.value ? item : max
    , data[0]);
    
    return { total, average, peak };
  }, [data]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <HeatMapSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              高峰: {dayLabels[stats.peak.day]} {formatTime(stats.peak.hour)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 時間軸標籤 */}
        <div className="flex items-start">
          <div className="w-8" /> {/* 為星期標籤留空間 */}
          <div className="flex-1 grid grid-cols-24 gap-px text-xs text-muted-foreground">
            {hourLabels.map((hour, index) => (
              <div
                key={hour}
                className={cn(
                  "text-center text-[10px]",
                  index % 4 !== 0 && "opacity-0" // 只顯示每4小時的標籤
                )}
                style={{ 
                  width: `${cellSize}px`,
                  fontSize: '10px'
                }}
              >
                {hour}
              </div>
            ))}
          </div>
        </div>
        
        {/* 熱力圖網格 */}
        <TooltipProvider>
          <div className="flex">
            {/* 星期標籤 */}
            <div className="flex flex-col justify-start space-y-px mr-2">
              {dayLabels.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-end text-xs text-muted-foreground pr-2"
                  style={{ height: `${cellSize}px` }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* 熱力圖格子 */}
            <div className="grid grid-cols-24 gap-px">
              {processedData.flatMap((dayRow, dayIndex) =>
                dayRow.map((hourData, hourIndex) => {
                  const value = hourData?.value || 0;
                  const intensity = getIntensity(value, calculatedMaxValue);
                  const colorClass = colorSchemes[colorScheme][intensity as keyof typeof colorSchemes[typeof colorScheme]];
                  
                  return (
                    <Tooltip key={`${dayIndex}-${hourIndex}`}>
                      <TooltipTrigger>
                        <div
                          className={cn(
                            "border border-border rounded-sm hover:ring-2 hover:ring-primary/20 transition-all duration-200 hover:scale-110",
                            colorClass
                          )}
                          style={{ 
                            width: `${cellSize}px`,
                            height: `${cellSize}px`
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">
                            {dayLabels[dayIndex]} {formatTime(hourIndex)}
                          </p>
                          <p>{value} 次活動</p>
                          {hourData?.label && (
                            <p className="text-muted-foreground text-xs">
                              {hourData.label}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          </div>
        </TooltipProvider>
        
        {/* 圖例和統計 */}
        <div className="space-y-3">
          {showLegend && (
            <Legend colorScheme={colorScheme} maxValue={calculatedMaxValue} />
          )}
          
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>總活動: {stats.total.toLocaleString()} 次</span>
            <span>平均: {Math.round(stats.average)} 次/時段</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeatMap;
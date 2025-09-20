import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, TrendingUp, Grid3x3, BarChart3, Eye, EyeOff } from "lucide-react";
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
  defaultView?: "detailed" | "simplified";
  showViewToggle?: boolean;
}

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const hourLabels = Array.from({ length: 24 }, (_, i) => 
  i.toString().padStart(2, '0')
);

// 時段分組標籤
const timeSlots = [
  { label: "早上", range: [6, 11], color: "#fbbf24" },
  { label: "下午", range: [12, 17], color: "#60a5fa" },
  { label: "晚上", range: [18, 23], color: "#a78bfa" },
  { label: "深夜", range: [0, 5], color: "#34d399" }
];

const getTimeSlot = (hour: number) => {
  return timeSlots.find(slot => 
    hour >= slot.range[0] && hour <= slot.range[1]
  ) || timeSlots[3]; // 預設為深夜
};

const colorSchemes = {
  // 提高暗色模式下的可讀性：使用 400 色階作為基色，漸進式提高透明度
  blue: {
    0: "bg-blue-50 dark:bg-sky-400/20",
    1: "bg-blue-100 dark:bg-sky-400/30", 
    2: "bg-blue-200 dark:bg-sky-400/40",
    3: "bg-blue-300 dark:bg-sky-400/50",
    4: "bg-blue-400 dark:bg-sky-400/60",
    5: "bg-blue-500 dark:bg-sky-400/70"
  },
  green: {
    0: "bg-green-50 dark:bg-emerald-400/20",
    1: "bg-green-100 dark:bg-emerald-400/30",
    2: "bg-green-200 dark:bg-emerald-400/40", 
    3: "bg-green-300 dark:bg-emerald-400/50",
    4: "bg-green-400 dark:bg-emerald-400/60",
    5: "bg-green-500 dark:bg-emerald-400/70"
  },
  purple: {
    0: "bg-purple-50 dark:bg-violet-400/20",
    1: "bg-purple-100 dark:bg-violet-400/30",
    2: "bg-purple-200 dark:bg-violet-400/40",
    3: "bg-purple-300 dark:bg-violet-400/50", 
    4: "bg-purple-400 dark:bg-violet-400/60",
    5: "bg-purple-500 dark:bg-violet-400/70"
  },
  orange: {
    0: "bg-orange-50 dark:bg-amber-400/20",
    1: "bg-orange-100 dark:bg-amber-400/30",
    2: "bg-orange-200 dark:bg-amber-400/40",
    3: "bg-orange-300 dark:bg-amber-400/50",
    4: "bg-orange-400 dark:bg-amber-400/60", 
    5: "bg-orange-500 dark:bg-amber-400/70"
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

// 簡化視圖組件
const SimplifiedView: React.FC<{
  data: HeatMapData[];
  colorScheme: keyof typeof colorSchemes;
  maxValue: number;
}> = ({ data, colorScheme, maxValue }) => {
  const simplifiedData = useMemo(() => {
    const result: { [key: string]: { [day: number]: number } } = {};
    
    timeSlots.forEach(slot => {
      result[slot.label] = {};
      dayLabels.forEach((_, dayIndex) => {
        result[slot.label][dayIndex] = 0;
      });
    });

    data.forEach(item => {
      const slot = getTimeSlot(item.hour);
      if (result[slot.label]) {
        result[slot.label][item.day] = (result[slot.label][item.day] || 0) + item.value;
      }
    });

    return result;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* 時段圖表 */}
      <div className="space-y-4">
        {timeSlots.map(slot => (
          <div key={slot.label} className="space-y-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: slot.color }}
              />
              <span className="text-sm font-medium">{slot.label}</span>
              <span className="text-xs text-muted-foreground">
                ({slot.range[0].toString().padStart(2, '0')}:00 - {slot.range[1].toString().padStart(2, '0')}:59)
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dayLabels.map((day, dayIndex) => {
                const value = simplifiedData[slot.label]?.[dayIndex] || 0;
                const intensity = getIntensity(value, maxValue);
                const colorClass = colorSchemes[colorScheme][intensity as keyof typeof colorSchemes[typeof colorScheme]];
                
                return (
                  <TooltipProvider key={dayIndex}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-md border border-border hover:ring-2 hover:ring-primary/20 transition-all duration-200 hover:scale-105 flex items-center justify-center text-xs font-medium",
                              colorClass
                            )}
                          >
                            {day}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">{day} {slot.label}</p>
                          <p>{value} 次活動</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeatMap: React.FC<HeatMapProps> = ({
  data,
  title = "用戶活躍度熱力圖",
  isLoading = false,
  className,
  showLegend = true,
  colorScheme = "blue",
  maxValue,
  cellSize = 16,
  cellGap: _cellGap = 2,
  defaultView = "detailed",
  showViewToggle = true
}) => {
  const [viewMode, setViewMode] = useState<"detailed" | "simplified">(defaultView);
  const [isCompact, setIsCompact] = useState(false);
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
            {showViewToggle && (
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === "detailed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("detailed")}
                  className="h-7 px-2 text-xs"
                >
                  <Grid3x3 className="h-3 w-3 mr-1" />
                  詳細
                </Button>
                <Button
                  variant={viewMode === "simplified" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("simplified")}
                  className="h-7 px-2 text-xs"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  簡化
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompact(!isCompact)}
              className="h-7 px-2"
            >
              {isCompact ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {viewMode === "simplified" ? (
          <SimplifiedView 
            data={data}
            colorScheme={colorScheme}
            maxValue={calculatedMaxValue}
          />
        ) : (
          <>
            {/* 時間軸標籤 */}
            {!isCompact && (
              <div className="flex items-start">
                <div className="w-8" /> {/* 為星期標籤留空間 */}
                <div className="flex-1 grid grid-cols-24 gap-px text-xs text-muted-foreground">
                  {hourLabels.map((hour, index) => (
                    <div
                      key={hour}
                      className={cn(
                        "text-center text-[10px]",
                        index % (isCompact ? 6 : 4) !== 0 && "opacity-0"
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
            )}
            
            {/* 熱力圖網格 */}
            <TooltipProvider>
              <div className="flex">
                {/* 星期標籤 */}
                <div className="flex flex-col justify-start space-y-px mr-2">
                  {dayLabels.map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-end text-xs text-muted-foreground pr-2"
                      style={{ height: `${isCompact ? cellSize * 0.8 : cellSize}px` }}
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
                      const actualCellSize = isCompact ? cellSize * 0.8 : cellSize;
                      
                      return (
                        <Tooltip key={`${dayIndex}-${hourIndex}`}>
                          <TooltipTrigger>
                            <div
                              className={cn(
                                "border border-border dark:border-white/10 rounded-sm hover:ring-2 hover:ring-primary/30 transition-all duration-200 hover:scale-110",
                                colorClass
                              )}
                              style={{ 
                                width: `${actualCellSize}px`,
                                height: `${actualCellSize}px`
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
          </>
        )}
        
        {/* 圖例和統計 */}
        <div className="space-y-3">
          {showLegend && viewMode === "detailed" && (
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

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Maximize2,
  RefreshCw,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartData {
  [key: string]: string | number | boolean;
}

interface ChartWidgetProps {
  title: string;
  data: ChartData[];
  chartType?: "bar" | "line" | "area" | "pie";
  isLoading?: boolean;
  className?: string;
  height?: number;
  showControls?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'csv') => void;
  trend?: {
    value: number;
    isPositive: boolean;
    description: string;
  };
  config?: {
    [key: string]: {
      label: string;
      color: string;
    };
  };
  timeRange?: {
    current: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
  };
  customColors?: string[];
}

const defaultColors = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5a2b"
];

const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <Skeleton className={`w-full h-[${height}px] rounded-lg`} />
    <div className="flex justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

const TrendIndicator: React.FC<{ trend: ChartWidgetProps['trend'] }> = ({ trend }) => {
  if (!trend) return null;
  
  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className={cn(
          "px-2 py-1 text-xs",
          trend.isPositive 
            ? "text-green-700 bg-green-50 border-green-200" 
            : "text-red-700 bg-red-50 border-red-200"
        )}
      >
        {trend.isPositive ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {Math.abs(trend.value)}%
      </Badge>
      <span className="text-sm text-muted-foreground">
        {trend.description}
      </span>
    </div>
  );
};

const ChartControls: React.FC<{
  showExport?: boolean;
  showRefresh?: boolean;
  timeRange?: ChartWidgetProps['timeRange'];
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'csv') => void;
}> = ({ 
  showExport, 
  showRefresh, 
  timeRange, 
  onRefresh, 
  onExport 
}) => (
  <div className="flex items-center space-x-2">
    {timeRange && (
      <Select value={timeRange.current} onValueChange={timeRange.onChange}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeRange.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
    
    {showRefresh && (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        className="h-8 px-2"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    )}
    
    {showExport && (
      <Select onValueChange={(value) => onExport?.(value as 'png' | 'csv')}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <Download className="h-3 w-3 mr-1" />
          <SelectValue placeholder="導出" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="csv">CSV</SelectItem>
        </SelectContent>
      </Select>
    )}
  </div>
);

const renderChart = (
  chartType: string,
  data: ChartData[],
  config: Record<string, unknown>,
  colors: string[]
) => {
  switch (chartType) {
    case "bar":
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {Object.keys(config || {}).map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              fill={colors[index] || defaultColors[index]} 
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      );

    case "line":
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {Object.keys(config || {}).map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index] || defaultColors[index]}
              strokeWidth={2}
              dot={{ fill: colors[index] || defaultColors[index], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      );

    case "area":
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {Object.keys(config || {}).map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index] || defaultColors[index]}
              fill={colors[index] || defaultColors[index]}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      );

    case "pie":
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index] || defaultColors[index % defaultColors.length]} 
              />
            ))}
          </Pie>
          <ChartTooltip 
            content={<ChartTooltipContent />} 
            formatter={(value, name) => [value, name]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            formatter={(value) => value}
          />
        </PieChart>
      );

    default:
      return <div>不支援的圖表類型</div>;
  }
};

const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  data,
  chartType = "bar",
  isLoading = false,
  className,
  height = 300,
  showControls = false,
  showExport = false,
  showRefresh = false,
  onRefresh,
  onExport,
  trend,
  config = {},
  timeRange,
  customColors = defaultColors
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <ChartSkeleton height={height} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full group hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <TrendIndicator trend={trend} />
          </div>
          <div className="flex items-center space-x-2">
            {showControls && (
              <ChartControls
                showExport={showExport}
                showRefresh={showRefresh}
                timeRange={timeRange}
                onRefresh={onRefresh}
                onExport={onExport}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-6">
        <ChartContainer
          config={config}
          className={cn(
            "w-full transition-all duration-300",
            isExpanded && "h-[500px]"
          )}
          style={{
            height: isExpanded ? "500px" : `${height}px`
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(chartType, processedData, config, customColors)}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ChartWidget;
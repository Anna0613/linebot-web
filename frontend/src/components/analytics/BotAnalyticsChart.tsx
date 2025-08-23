import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, MessageSquare, Activity } from 'lucide-react';

interface BotAnalyticsData {
  active_users: number;
  total_interactions: number;
  today_interactions: number;
  week_interactions: number;
  month_interactions: number;
  activity_distribution?: Array<{
    time_slot: string;
    active_users: number;
  }>;
  period: string;
  start_date: string;
  end_date: string;
}

interface BotAnalyticsChartProps {
  data: BotAnalyticsData;
}

const BotAnalyticsChart: React.FC<BotAnalyticsChartProps> = ({ data }) => {
  // 準備圖表資料
  const interactionTrends = [
    { name: '今日', value: data.today_interactions, color: '#3b82f6' },
    { name: '本週', value: data.week_interactions, color: '#10b981' },
    { name: '本月', value: data.month_interactions, color: '#f59e0b' },
  ];

  const activityData = data.activity_distribution || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 統計摘要 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="h-4 w-4 mr-2" />
              活躍用戶
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.active_users}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.period === 'week' ? '本週' : data.period === 'month' ? '本月' : '今日'}活躍用戶
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              總互動數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.total_interactions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              統計期間內總互動次數
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 互動趨勢圖 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            互動趨勢
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 使用者活動分佈 */}
      {activityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              用戶活動分佈
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time_slot" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="active_users" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* 期間資訊 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>統計期間</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div>
              <span className="font-medium">開始時間：</span>
              {new Date(data.start_date).toLocaleString('zh-TW')}
            </div>
            <div>
              <span className="font-medium">結束時間：</span>
              {new Date(data.end_date).toLocaleString('zh-TW')}
            </div>
            <div>
              <span className="font-medium">統計週期：</span>
              {data.period === 'day' ? '日' : data.period === 'week' ? '週' : '月'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotAnalyticsChart;
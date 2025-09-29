import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, Clock, Play, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '../../config/apiConfig';

interface ProcessingJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_chunks: number;
  processed_chunks: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  metadata: {
    filename?: string;
    content_length?: number;
    scope: string;
  };
}

interface ProcessingJobTrackerProps {
  botId: string;
  onJobCompleted?: (jobId: string) => void;
  onJobFailed?: (jobId: string, error: string) => void;
}

const ProcessingJobTracker: React.FC<ProcessingJobTrackerProps> = ({
  botId,
  onJobCompleted,
  onJobFailed
}) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);

  // 獲取任務列表
  const fetchJobs = useCallback(async () => {
    if (!botId) return;
    
    try {
      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/jobs`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const jobList = await response.json();
        setJobs(jobList);
        
        // 檢查是否有新完成或失敗的任務
        jobList.forEach((job: ProcessingJob) => {
          const existingJob = jobs.find(j => j.job_id === job.job_id);
          
          if (existingJob && existingJob.status !== job.status) {
            if (job.status === 'completed' && onJobCompleted) {
              onJobCompleted(job.job_id);
              toast({
                title: '處理完成',
                description: `${job.metadata.filename || '文字內容'} 已成功處理`
              });
            } else if (job.status === 'failed' && onJobFailed) {
              onJobFailed(job.job_id, job.error_message || '處理失敗');
              toast({
                variant: 'destructive',
                title: '處理失敗',
                description: job.error_message || '未知錯誤'
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('獲取任務列表失敗:', error);
    }
  }, [botId, jobs, onJobCompleted, onJobFailed, toast]);

  // 定期更新任務狀態
  useEffect(() => {
    if (!botId) return;
    
    fetchJobs();
    
    // 每 2 秒更新一次進行中的任務
    const interval = setInterval(() => {
      const hasActiveJobs = jobs.some(job => 
        job.status === 'pending' || job.status === 'processing'
      );
      
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [botId, fetchJobs, jobs]);

  // 取消任務
  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: '任務已取消',
          description: '處理任務已成功取消'
        });
        fetchJobs();
      } else {
        throw new Error('取消失敗');
      }
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: '取消失敗',
        description: '無法取消任務，請稍後再試'
      });
    }
  };

  // 獲取狀態圖標
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // 獲取狀態標籤
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'outline',
      failed: 'destructive'
    } as const;
    
    const labels = {
      pending: '等待中',
      processing: '處理中',
      completed: '已完成',
      failed: '失敗'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // 格式化時間
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          處理任務
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.job_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="font-medium">
                    {job.metadata.filename || '文字內容'}
                  </span>
                  {getStatusBadge(job.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatTime(job.created_at)}
                  </span>
                  {(job.status === 'pending' || job.status === 'processing') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelJob(job.job_id)}
                    >
                      取消
                    </Button>
                  )}
                </div>
              </div>
              
              {job.status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={job.progress * 100} className="w-full" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>進度: {Math.round(job.progress * 100)}%</span>
                    <span>
                      {job.processed_chunks} / {job.total_chunks} 切塊
                    </span>
                  </div>
                </div>
              )}
              
              {job.status === 'failed' && job.error_message && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  錯誤: {job.error_message}
                </div>
              )}
              
              {job.status === 'completed' && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ 已完成 {job.total_chunks} 個切塊的處理
                  {job.completed_at && (
                    <span className="ml-2 text-muted-foreground">
                      於 {formatTime(job.completed_at)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingJobTracker;

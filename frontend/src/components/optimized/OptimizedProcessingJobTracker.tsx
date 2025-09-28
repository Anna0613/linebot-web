/**
 * 優化版本的處理任務追蹤器
 * 使用智能輪詢，只在有活動任務時進行檢查
 */
import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, Clock, Play, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '../../config/apiConfig';
import { useOptimizedJobCheck } from '../../hooks/useOptimizedPolling';

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

interface OptimizedProcessingJobTrackerProps {
  botId: string;
  onJobCompleted?: (jobId: string) => void;
  onJobFailed?: (jobId: string, error: string) => void;
}

const OptimizedProcessingJobTracker: React.FC<OptimizedProcessingJobTrackerProps> = ({
  botId,
  onJobCompleted,
  onJobFailed
}) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);

  // 檢查是否有活動任務
  const hasActiveJobs = useCallback(() => {
    return jobs.some(job => job.status === 'pending' || job.status === 'processing');
  }, [jobs]);

  // 獲取任務列表
  const fetchJobs = useCallback(async () => {
    if (!botId) return;
    
    try {
      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/jobs`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const jobList = await response.json();
        setJobs(prevJobs => {
          // 檢查是否有新完成或失敗的任務
          jobList.forEach((job: ProcessingJob) => {
            const existingJob = prevJobs.find(j => j.job_id === job.job_id);
            
            if (existingJob && existingJob.status !== job.status) {
              if (job.status === 'completed') {
                toast({
                  title: "處理完成",
                  description: `檔案 "${job.metadata.filename || job.job_id}" 處理完成`,
                });
                onJobCompleted?.(job.job_id);
              } else if (job.status === 'failed') {
                toast({
                  variant: "destructive",
                  title: "處理失敗",
                  description: job.error_message || `檔案 "${job.metadata.filename || job.job_id}" 處理失敗`,
                });
                onJobFailed?.(job.job_id, job.error_message || '未知錯誤');
              }
            }
          });
          
          return jobList;
        });
      }
    } catch (error) {
      console.error('獲取任務列表失敗:', error);
    }
  }, [botId, onJobCompleted, onJobFailed, toast]);

  // 使用優化的任務輪詢
  useOptimizedJobCheck(fetchJobs, hasActiveJobs);

  // 取消任務
  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "任務已取消",
          description: "處理任務已成功取消",
        });
        fetchJobs(); // 重新獲取任務列表
      } else {
        throw new Error('取消任務失敗');
      }
    } catch (error) {
      console.error('取消任務失敗:', error);
      toast({
        variant: "destructive",
        title: "取消失敗",
        description: "無法取消任務，請稍後再試",
      });
    }
  };

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ProcessingJob['status']) => {
    const variants = {
      completed: 'default' as const,
      failed: 'destructive' as const,
      processing: 'default' as const,
      pending: 'secondary' as const
    };

    const labels = {
      completed: '已完成',
      failed: '失敗',
      processing: '處理中',
      pending: '等待中'
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  // 總是顯示組件，即使沒有任務也顯示空狀態

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Play className="h-5 w-5 mr-2" />
          處理任務
          <Badge variant="outline" className="ml-2">
            {jobs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.job_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(job.status)}
                  <span className="font-medium text-sm">
                    {job.metadata.filename || `任務 ${job.job_id.slice(0, 8)}`}
                  </span>
                  {getStatusBadge(job.status)}
                </div>
                {(job.status === 'pending' || job.status === 'processing') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelJob(job.job_id)}
                    className="text-xs"
                  >
                    取消
                  </Button>
                )}
              </div>
              
              {job.status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={job.progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    進度: {job.processed_chunks}/{job.total_chunks} 區塊 ({job.progress.toFixed(1)}%)
                  </div>
                </div>
              )}
              
              {job.status === 'failed' && job.error_message && (
                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                  錯誤: {job.error_message}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                建立時間: {new Date(job.created_at).toLocaleString()}
                {job.completed_at && (
                  <span className="ml-2">
                    完成時間: {new Date(job.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedProcessingJobTracker;

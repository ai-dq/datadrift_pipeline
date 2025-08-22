'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContainerLogs } from '@/hooks/network/logs';
import { LogStreamOptions } from '@/lib/api/endpoints';
import {
  Activity,
  Download,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function LogsMonitoringPage() {
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [tailLines, setTailLines] = useState<string>('200');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const logOptions: LogStreamOptions = {
    include: selectedContainer.trim() || undefined,
    follow: true,
    timestamps: includeTimestamps,
    tail: tailLines === 'all' ? 'all' : parseInt(tailLines) || 200,
  };

  // Only pass valid options when both streaming and container are selected
  const shouldStream = isStreaming && selectedContainer.trim();
  const hookOptions = shouldStream
    ? logOptions
    : { include: 'no-container-selected' };

  const {
    data: logs,
    loading,
    error,
    refetch,
    reset,
  } = useContainerLogs(hookOptions);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current && logs.length > 0) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleStartStreaming = useCallback(async () => {
    if (!selectedContainer.trim()) return;
    setIsStreaming(true);
    await refetch();
  }, [selectedContainer, refetch]);

  const handleStopStreaming = useCallback(() => {
    setIsStreaming(false);
    reset();
  }, [reset]);

  const handleClearLogs = useCallback(() => {
    reset();
  }, [reset]);

  const handleDownloadLogs = useCallback(() => {
    if (logs.length === 0) return;

    const logText = logs
      .map((log) => {
        const timestamp = includeTimestamps
          ? `[${new Date().toISOString()}] `
          : '';
        const container = log.container ? `[${log.container}] ` : '';
        const stream = log.stream ? `[${log.stream}] ` : '';
        return `${timestamp}${container}${stream}${log.message}`;
      })
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `container-logs-${selectedContainer}-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, selectedContainer, includeTimestamps]);

  const formatLogMessage = (log: any) => {
    if (log.error) {
      return `ERROR: ${log.error}`;
    }
    if (log.info) {
      return `INFO: ${log.info}`;
    }
    return log.message || '';
  };

  const getLogLevel = (log: any) => {
    if (log.error) return 'error';
    if (log.info) return 'info';
    if (log.stream === 'stderr') return 'error';
    return 'default';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Container Logs Monitoring
        </h1>
        <p className="text-sm text-gray-600">
          Real-time container log streaming and monitoring
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Log Stream Configuration
          </CardTitle>
          <CardDescription>
            Configure container selection and streaming options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="container">Container/Service</Label>
              <Input
                id="container"
                placeholder="e.g., nginx, api, database"
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                disabled={isStreaming}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tail">Tail Lines</Label>
              <Select
                value={tailLines}
                onValueChange={setTailLines}
                disabled={isStreaming}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 lines</SelectItem>
                  <SelectItem value="100">100 lines</SelectItem>
                  <SelectItem value="200">200 lines</SelectItem>
                  <SelectItem value="500">500 lines</SelectItem>
                  <SelectItem value="1000">1000 lines</SelectItem>
                  <SelectItem value="all">All lines</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamps">Options</Label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeTimestamps}
                    onChange={(e) => setIncludeTimestamps(e.target.checked)}
                    disabled={isStreaming}
                    className="rounded"
                  />
                  <span className="text-sm">Timestamps</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Controls</Label>
              <div className="flex gap-2">
                {!isStreaming ? (
                  <Button
                    onClick={handleStartStreaming}
                    disabled={!selectedContainer.trim() || loading}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopStreaming}
                    variant="outline"
                    size="sm"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
                <Button onClick={handleClearLogs} variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              <CardTitle>
                Live Log Stream
                {selectedContainer && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedContainer})
                  </span>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity
                  className={`h-4 w-4 ${isStreaming ? 'text-green-500' : 'text-gray-400'}`}
                />
                {isStreaming ? 'Streaming' : 'Stopped'}
                {logs.length > 0 && (
                  <span className="ml-2">{logs.length} messages</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={autoScroll ? 'bg-blue-50' : ''}
                >
                  <RotateCcw
                    className={`h-4 w-4 ${autoScroll ? 'text-blue-600' : ''}`}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLogs}
                  disabled={logs.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <CardDescription>
            {!isStreaming && !selectedContainer
              ? 'Enter a container/service name and click Start to begin streaming logs'
              : isStreaming
                ? 'Real-time log stream is active'
                : 'Log stream is stopped'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="h-96 w-full overflow-auto bg-black text-green-400 p-4 rounded-md font-mono text-sm"
            style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
          >
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {isStreaming ? (
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Waiting for log messages...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No log messages</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => {
                  const level = getLogLevel(log);
                  const textColor =
                    level === 'error'
                      ? 'text-red-400'
                      : level === 'info'
                        ? 'text-blue-400'
                        : 'text-green-400';

                  return (
                    <div key={index} className={`${textColor} leading-relaxed`}>
                      {log.container && (
                        <span className="text-yellow-400">
                          [{log.container}]
                        </span>
                      )}{' '}
                      {log.stream && (
                        <span className="text-purple-400">[{log.stream}]</span>
                      )}{' '}
                      <span>{formatLogMessage(log)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

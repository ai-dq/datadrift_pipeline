import {
  streamContainerLogs,
  LogMessage,
  LogStreamOptions,
} from '@/lib/api/endpoints';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for streaming container logs using Server-Sent Events
 */
export function useContainerLogs(options: LogStreamOptions = {}): {
  data: LogMessage[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  reset: () => void;
} {
  const [data, setData] = useState<LogMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async () => {
    if (loading) return;

    // Validate that include parameter is provided and not a dummy value
    if (!options.include?.trim() || options.include === 'no-container-selected') {
      // Don't set error for dummy values, just silently return
      if (options.include !== 'no-container-selected') {
        setError("Container name is required to start streaming logs");
      }
      return;
    }

    setError(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      console.log('=▶︎ Starting container logs stream with options:', options);
      const generator = streamContainerLogs(options);

      let eventCount = 0;
      for await (const event of generator) {
        eventCount++;
        console.log(`=▶︎ Log SSE Event #${eventCount}:`, {
          data: event.data,
          type: typeof event.data,
          event: event.event,
          id: event.id,
          timestamp: new Date().toISOString(),
        });

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          console.log('L Container logs stream aborted');
          break;
        }

        try {
          // Handle the SSE event data - it might already be an object or a JSON string
          let logData: LogMessage;

          if (typeof event.data === 'string') {
            // If it's a string, parse it as JSON
            logData = JSON.parse(event.data) as LogMessage;
          } else if (typeof event.data === 'object' && event.data !== null) {
            // If it's already an object, use it directly
            logData = event.data as LogMessage;
          } else {
            console.warn(
              'Unexpected log event data type:',
              typeof event.data,
              event.data,
            );
            continue;
          }

          // Append new log message to existing data
          setData((prevData) => [...prevData, logData]);
        } catch (parseError) {
          console.warn('Failed to parse log message data:', parseError);
          console.warn('Event data was:', event.data);
          // Continue processing other events even if one fails to parse
        }
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to stream container logs';
        setError(errorMessage);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [options, loading]);

  const refetch = useCallback(async () => {
    // Clear current data for new stream
    setData([]);
    setLoading(true);
    await startStreaming();
  }, [startStreaming]);

  const reset = useCallback(() => {
    setData([]);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
  };
}

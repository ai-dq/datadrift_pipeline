import { APIClient, ApiError, SSEEvent } from '../client';

export interface LogMessage {
  container: string;
  stream?: 'stdout' | 'stderr';
  message: string;
  error?: string;
  info?: string;
}

export interface LogStreamOptions {
  /** Follow logs in real-time (default: true) */
  follow?: boolean;
  /** Include timestamps in log output (default: true) */
  timestamps?: boolean;
  /** Show logs since this Unix timestamp */
  since?: number;
  /** Number of lines to show from end of logs (default: 200) */
  tail?: number | 'all';
  /** Comma-separated container/service names to include */
  include?: string;
  /** Comma-separated container/service names to exclude */
  exclude?: string;
}

export const streamContainerLogs = async function* (
  options: LogStreamOptions = {},
): AsyncGenerator<SSEEvent<LogMessage>, void, unknown> {
  try {
    const response = APIClient.internal.getStream<LogMessage>('/logs', {
      query: {
        follow: options.follow ?? true,
        timestamps: options.timestamps ?? true,
        ...(options.since !== undefined && { since: options.since }),
        ...(options.tail !== undefined && { tail: options.tail }),
        ...(options.include && { include: options.include }),
        ...(options.exclude && { exclude: options.exclude }),
      },
    });
    yield* response;
  } catch (error) {
    console.error('Failed to stream container logs:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to stream container logs');
  }
};

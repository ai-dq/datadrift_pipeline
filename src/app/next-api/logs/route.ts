import Docker from 'dockerode';
import { NextRequest } from 'next/server';
import { PassThrough } from 'node:stream';

export const runtime = 'nodejs';

const dockerClient = new Docker({ socketPath: '/var/run/docker.sock' });

const DEFAULT_TAIL_LINES = Number(process.env.NEXT_LOGS_DEFAULT_TAIL ?? '200');
const MAX_CHUNK_SIZE_BYTES = Number(
  process.env.NEXT_LOGS_MAX_CHUNK_BYTES ?? `${64 * 1024}`,
);
const ENVIRONMENT_INCLUDE_FILTERS = parseEnvironmentFilters(
  process.env.NEXT_LOGS_INCLUDE ?? '',
);
const ENVIRONMENT_EXCLUDE_FILTERS = parseEnvironmentFilters(
  process.env.NEXT_LOGS_EXCLUDE ?? '',
);
const HEARTBEAT_INTERVAL_MS = 15000;

function parseEnvironmentFilters(envValue: string): string[] {
  return envValue
    .split(',')
    .map((filter: string) => filter.trim())
    .filter(Boolean);
}

interface LogStreamOptions {
  followLogs: boolean;
  includeTimestamps: boolean;
  sinceTimestamp?: number;
  tailLines?: number;
}

interface ContainerFilters {
  includePatterns: string[];
  excludePatterns: string[];
}

function parseQueryParameters(searchParams: URLSearchParams) {
  const tailParam = searchParams.get('tail');
  const sinceParam = searchParams.get('since');
  const followParam = searchParams.get('follow');
  const timestampsParam = searchParams.get('timestamps');
  const includeParam = searchParams.get('include');
  const excludeParam = searchParams.get('exclude');

  const includeFilters = includeParam
    ? includeParam
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : ENVIRONMENT_INCLUDE_FILTERS;

  const excludeFilters = excludeParam
    ? excludeParam
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : ENVIRONMENT_EXCLUDE_FILTERS;

  const followLogs = followParam !== 'false';
  const includeTimestamps = timestampsParam !== 'false';
  const sinceTimestamp = sinceParam ? Number(sinceParam) : undefined;

  let tailLines =
    tailParam && tailParam !== 'all' ? Number(tailParam) : undefined;

  if (
    (tailLines === undefined || Number.isNaN(tailLines)) &&
    (sinceTimestamp === undefined || Number.isNaN(sinceTimestamp))
  ) {
    tailLines = DEFAULT_TAIL_LINES;
  }

  return {
    streamOptions: {
      followLogs,
      includeTimestamps,
      sinceTimestamp,
      tailLines,
    } as LogStreamOptions,
    containerFilters: {
      includePatterns: includeFilters.map((s: string) => s.toLowerCase()),
      excludePatterns: excludeFilters.map((s: string) => s.toLowerCase()),
    } as ContainerFilters,
  };
}

function getContainerIdentifiers(container: Docker.ContainerInfo) {
  const containerName = (container.Names?.[0] ?? container.Id).replace(
    /^\//,
    '',
  );
  const serviceName = container.Labels?.['com.docker.compose.service'] ?? '';
  return { containerName, serviceName };
}

function matchesFilters(
  containerName: string,
  serviceName: string,
  patterns: string[],
): boolean {
  const lowerContainerName = containerName.toLowerCase();
  const lowerServiceName = serviceName.toLowerCase();

  return patterns.some(
    (pattern: string) =>
      lowerContainerName.includes(pattern) ||
      (lowerServiceName && lowerServiceName.includes(pattern)),
  );
}

function filterContainers(
  containers: Docker.ContainerInfo[],
  containerFilters: ContainerFilters,
): Docker.ContainerInfo[] {
  return containers.filter((container) => {
    const { containerName, serviceName } = getContainerIdentifiers(container);

    const includesMatch = matchesFilters(
      containerName,
      serviceName,
      containerFilters.includePatterns,
    );
    const excludesMatch =
      containerFilters.excludePatterns.length > 0
        ? matchesFilters(
            containerName,
            serviceName,
            containerFilters.excludePatterns,
          )
        : false;

    return includesMatch && !excludesMatch;
  });
}

async function getRunningContainers(): Promise<Docker.ContainerInfo[]> {
  return new Promise<Docker.ContainerInfo[]>((resolve, reject) => {
    dockerClient.listContainers(
      { all: false },
      (error: any, containers: any) => {
        if (error) return reject(error);
        resolve(containers || []);
      },
    );
  });
}

async function createContainerLogStream(
  container: Docker.ContainerInfo,
  streamOptions: LogStreamOptions,
): Promise<NodeJS.ReadableStream> {
  const dockerContainer = dockerClient.getContainer(container.Id);

  const logOptions: any = {
    follow: streamOptions.followLogs,
    stdout: true,
    stderr: true,
    timestamps: streamOptions.includeTimestamps,
  };

  if (
    streamOptions.sinceTimestamp !== undefined &&
    !Number.isNaN(streamOptions.sinceTimestamp)
  ) {
    logOptions.since = streamOptions.sinceTimestamp;
  }

  if (
    streamOptions.tailLines !== undefined &&
    !Number.isNaN(streamOptions.tailLines)
  ) {
    logOptions.tail = streamOptions.tailLines;
  }

  return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    dockerContainer.logs(logOptions, (error: any, logStream: any) => {
      if (error) return reject(error);
      if (!logStream) return reject(new Error('No log stream available'));
      resolve(logStream as NodeJS.ReadableStream);
    });
  });
}

export async function GET(request: NextRequest) {
  const responseStream = new ReadableStream({
    start: async (controller) => {
      const textEncoder = new TextEncoder();
      let isStreamClosed = false;
      const requestUrl = new URL(request.url);

      const writeSSEData = (data: string) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
        } catch {
          // Ignore errors if controller is closed
        }
      };

      const { streamOptions, containerFilters } = parseQueryParameters(
        requestUrl.searchParams,
      );

      // Require include patterns to prevent accidentally streaming all containers
      if (containerFilters.includePatterns.length === 0) {
        writeSSEData(
          JSON.stringify({
            error:
              "'include' parameter is required (comma-separated container/service names)",
          }),
        );

        setTimeout(() => {
          try {
            controller.close();
          } catch {}
        }, 0);
        return;
      }

      const activeStreams: Array<{
        containerId: string;
        containerName: string;
        stream: NodeJS.ReadableStream;
      }> = [];

      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const cleanupAllStreams = () => {
        if (isStreamClosed) return;
        isStreamClosed = true;

        if (heartbeatTimer) clearInterval(heartbeatTimer);

        activeStreams.forEach(({ stream }) => {
          try {
            stream.removeAllListeners();
            if (typeof (stream as any).destroy === 'function') {
              (stream as any).destroy();
            }
          } catch {}
        });

        try {
          controller.close();
        } catch {}
      };

      try {
        const allContainers = await getRunningContainers();
        const matchingContainers = filterContainers(
          allContainers,
          containerFilters,
        );

        if (matchingContainers.length === 0) {
          writeSSEData(
            JSON.stringify({
              info: 'No containers matched the include/exclude filters',
            }),
          );
        }

        // Set up log streams for each matching container
        for (const container of matchingContainers) {
          const containerLogStream = await createContainerLogStream(
            container,
            streamOptions,
          );
          const { containerName } = getContainerIdentifiers(container);

          // Check if container runs in TTY mode
          const dockerContainer = dockerClient.getContainer(container.Id);
          const containerInfo = await dockerContainer.inspect();
          const isTTY = containerInfo.Config.Tty;

          let stdoutStream: NodeJS.ReadableStream;
          let stderrStream: NodeJS.ReadableStream;

          if (isTTY) {
            // TTY containers output directly without multiplexing
            stdoutStream = containerLogStream;
            stderrStream = new PassThrough(); // Empty stream for TTY containers
          } else {
            // Demux Docker's multiplexed stream format for non-TTY containers
            const stdout = new PassThrough();
            const stderr = new PassThrough();

            // @ts-ignore - modem exists at runtime
            dockerClient.modem.demuxStream(containerLogStream, stdout, stderr);

            stdoutStream = stdout;
            stderrStream = stderr;
          }

          const createLogHandler =
            (streamType: 'stdout' | 'stderr') => (buffer: Buffer) => {
              let logBuffer = buffer;
              if (logBuffer.length > MAX_CHUNK_SIZE_BYTES) {
                logBuffer = logBuffer.subarray(
                  logBuffer.length - MAX_CHUNK_SIZE_BYTES,
                );
              }

              writeSSEData(
                JSON.stringify({
                  container: containerName,
                  stream: streamType,
                  message: logBuffer.toString('utf8'),
                }),
              );
            };

          const handleStreamError = (error: unknown) => {
            writeSSEData(
              JSON.stringify({
                container: containerName,
                error: String(error),
              }),
            );
          };

          const handleStreamEnd = () => {
            setTimeout(() => {
              if (!isStreamClosed) {
                const hasActiveStreams = activeStreams.some(
                  ({ stream }) => !(stream as any).closed,
                );
                if (!hasActiveStreams) {
                  cleanupAllStreams();
                }
              }
            }, 0);
          };

          stdoutStream.on('data', createLogHandler('stdout'));
          if (!isTTY) {
            stderrStream.on('data', createLogHandler('stderr'));
          }
          containerLogStream.on('error', handleStreamError);
          containerLogStream.on('end', handleStreamEnd);
          containerLogStream.on('close', handleStreamEnd);

          const streams = [
            {
              containerId: container.Id,
              containerName,
              stream: containerLogStream,
            },
            {
              containerId: container.Id,
              containerName: containerName + ':stdout',
              stream: stdoutStream,
            },
          ];

          if (!isTTY) {
            streams.push({
              containerId: container.Id,
              containerName: containerName + ':stderr',
              stream: stderrStream,
            });
          }

          activeStreams.push(...streams);
        }

        // Start heartbeat to keep connection alive
        heartbeatTimer = setInterval(() => {
          if (!isStreamClosed) {
            try {
              controller.enqueue(textEncoder.encode(': keep-alive\n\n'));
            } catch {}
          }
        }, HEARTBEAT_INTERVAL_MS);

        // Handle client disconnect
        (request as any).signal?.addEventListener('abort', cleanupAllStreams);
      } catch (error: any) {
        writeSSEData(
          JSON.stringify({
            error: error?.message || String(error),
          }),
        );
        cleanupAllStreams();
      }
    },
    cancel: () => {
      // Stream cancelled by client
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

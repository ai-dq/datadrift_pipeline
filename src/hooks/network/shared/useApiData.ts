import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic hook for fetching data from API endpoints
 * @template TResponse - The raw API response type
 * @template TEntity - The transformed entity type for UI consumption
 */
export function useApiData<TResponse, TEntity>({
  fetchFn,
  transformFn,
  errorMessage = 'Failed to fetch data',
  initialData,
  autoFetch = true,
}: {
  /**
   * Function that fetches data from the API
   */
  fetchFn: () => Promise<
    { items: TResponse[] } | { results: TResponse[] } | TResponse[]
  >;
  /**
   * Function that transforms API response to UI entity
   */
  transformFn: (response: TResponse) => TEntity;
  /**
   * Custom error message for failed requests
   */
  errorMessage?: string;
  /**
   * Initial data to populate the state
   */
  initialData?: TEntity[];
  /**
   * Whether to automatically fetch data on mount
   */
  autoFetch?: boolean;
}): {
  data: TEntity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<TEntity[]>(initialData || []);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const response = await fetchFn();

      // Check if request was aborted before updating state
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Handle both array responses and paginated responses with items property
      const items = Array.isArray(response) ? response : response.items;

      const transformedData = items.map(transformFn);
      setData(transformedData);
    } catch (err) {
      // Check if request was aborted before updating state
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      console.error(`${errorMessage}:`, err);
    } finally {
      // Check if request was aborted before updating state
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, transformFn, errorMessage]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }

    // Cleanup function to abort request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Generic hook for fetching a single item by ID
 * @template TResponse - The raw API response type
 * @template TEntity - The transformed entity type for UI consumption
 */
export function useApiItem<TResponse, TEntity>({
  fetchFn,
  transformFn,
  errorMessage = 'Failed to fetch item',
  autoFetch = true,
}: {
  /**
   * Function that fetches a single item from the API
   */
  fetchFn: () => Promise<TResponse>;
  /**
   * Function that transforms API response to UI entity
   */
  transformFn: (response: TResponse) => TEntity;
  /**
   * Custom error message for failed requests
   */
  errorMessage?: string;
  /**
   * Whether to automatically fetch data on mount
   */
  autoFetch?: boolean;
}): {
  data: TEntity | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<TEntity | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const response = await fetchFn();

      // Check if request was aborted before updating state
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const transformedData = transformFn(response);
      setData(transformedData);
    } catch (err) {
      // Check if request was aborted before updating state
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      console.error(`${errorMessage}:`, err);
    } finally {
      // Check if request was aborted before updating state
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, transformFn, errorMessage]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }

    // Cleanup function to abort request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for API operations with mutations (create, update, delete)
 * @template TRequest - The request payload type
 * @template TResponse - The API response type
 */
export function useApiMutation<TRequest = unknown, TResponse = unknown>({
  mutationFn,
  onSuccess,
  onError,
}: {
  /**
   * Function that performs the mutation
   */
  mutationFn: (data: TRequest) => Promise<TResponse>;
  /**
   * Callback function called on successful mutation
   */
  onSuccess?: (data: TResponse) => void;
  /**
   * Callback function called on failed mutation
   */
  onError?: (error: Error) => void;
}): {
  mutate: (data: TRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: TRequest) => {
      try {
        setLoading(true);
        setError(null);

        const response = await mutationFn(data);

        if (onSuccess) {
          onSuccess(response);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Mutation failed';
        setError(errorMessage);

        if (onError && err instanceof Error) {
          onError(err);
        }

        console.error('Mutation failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, onSuccess, onError],
  );

  return { mutate, loading, error };
}

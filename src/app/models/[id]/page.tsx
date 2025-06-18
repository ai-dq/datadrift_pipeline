'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModel, useModelVersions } from '@/hooks/network/models';
import { memo, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { columns } from './columns';
import { DataTable } from './data-table';
import { selectModelVersion } from '@/lib/api/endpoints';
import { ModelVersion } from '@/entities/ml-model';
import { Badge } from '@/components/ui/badge';

// Define MemoizedDataTable at the top level for effective memoization
const MemoizedDataTable = memo(
  ({
    versions,
    selectedVersion,
    handleVersionSelect,
  }: {
    versions: ModelVersion[];
    selectedVersion: string | null;
    handleVersionSelect: (version: string) => Promise<void>;
  }) => {
    return (
      <DataTable
        data={versions}
        columns={columns(selectedVersion, handleVersionSelect)}
      />
    );
  },
);
MemoizedDataTable.displayName = 'MemoizedDataTable';

/**
 * Component for rendering loading skeleton
 */
function ModelVersionPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Model Versions Table Skeleton */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Table header skeleton */}
              <div className="flex space-x-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
              {/* Table rows skeleton */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ModelVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const modelId = Number(id);
  const router = useRouter();

  const { data: model, loading: modelLoading } = useModel(modelId);
  const { data: rawVersions, loading: versionsLoading } =
    useModelVersions(modelId);

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (model?.version) {
      setSelectedVersion(model.version);
    }
  }, [model?.version]);

  const versions = useMemo(() => {
    if (!rawVersions) return [];

    return rawVersions.map((version: ModelVersion) => ({
      ...version,
      isSelected: version.version === selectedVersion,
    }));
  }, [rawVersions, selectedVersion]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      try {
        await selectModelVersion(modelId, version);
        setSelectedVersion(version);
        router.refresh();
      } catch (error) {
        console.error('Failed to select model version:', error);
      }
    },
    [modelId, router],
  );

  if (modelLoading || versionsLoading) {
    return <ModelVersionPageSkeleton />;
  }

  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-red-600">Error</h1>
        <p className="text-gray-500">Model not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-row justify-items-start items-baseline gap-2 mb-8">
        <h1 className="text-3xl font-bold">{model.name}</h1>
        <Badge variant="secondary" className="font-mono text-xs">
          v{selectedVersion}
        </Badge>
      </div>

      {/* Model Versions Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Model Versions</CardTitle>
              <p className="text-sm text-gray-500">
                Total {versions.length} versions
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <MemoizedDataTable
              versions={versions}
              selectedVersion={selectedVersion}
              handleVersionSelect={handleVersionSelect}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

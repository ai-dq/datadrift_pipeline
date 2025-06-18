'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Model } from '@/entities/ml-model';
import { useModel } from '@/hooks/network/models';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { columns } from './columns';
import { DataTable } from './data-table';
import React from 'react';

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Model>;
}) {
  const model = use(searchParams);
  const { id } = use(params);
  const { data: rawVersions, loading: modelLoading } = useModel(Number(id));

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );

  // Create a stable string of version IDs to use as a dependency for memoizing `versions`.
  // This ensures `versions` reference only changes if its content (IDs) changes.
  const stableVersionIds = useMemo(() => {
    if (!rawVersions || rawVersions.length === 0) return '';
    return rawVersions.map((v: { id: any }) => v.id).join(','); // Assuming each version object has an 'id' property
  }, [rawVersions]);

  // Memoized `versions` array. Its reference is stable if `stableVersionIds` is unchanged.
  const versions = useMemo(() => {
    if (!rawVersions) return []; // Or a more specific empty state if needed
    return rawVersions;
  }, [stableVersionIds]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
    console.log(`Version selected: ${versionId}`);
  }, []);

  useEffect(() => {
    console.log(
      '[Effect] Running. Deps - modelLoading:',
      modelLoading,
      'versions#:',
      versions?.length,
      'model.v:',
      model?.version,
      'selectedId:',
      selectedVersionId,
    );
    // If data is loading or versions array is not yet populated, do nothing.
    if (modelLoading || !versions || versions.length === 0) {
      console.log('[Effect] Bailing out: loading or no versions.');
      return;
    }

    const selectedVersion = versions.find(
      (v) => v.version.toString() === model.version,
    );
    const newSelectedId = selectedVersion?.id || null;
    console.log('[Effect] Calculated newSelectedId:', newSelectedId);

    // Only set state if the newly determined ID is different from the current one.
    if (newSelectedId !== selectedVersionId) {
      console.log(
        `[Effect] Updating selectedVersionId from ${selectedVersionId} to ${newSelectedId}. Model version: ${model.version}, Found version obj: ${selectedVersion?.version}`,
      );
      setSelectedVersionId(newSelectedId);
    } else {
      console.log(
        '[Effect] No update: newSelectedId is same as selectedVersionId.',
      );
    }
  }, [versions, model.version, selectedVersionId, modelLoading]);

  if (modelLoading) {
    return <ModelVersionPageSkeleton />;
  }

  const MemoizedDataTable = React.memo(() => {
    return (
      <DataTable
        data={versions}
        columns={columns(selectedVersionId, handleVersionSelect)}
      />
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{model.name}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {selectedVersionId && versions && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
              Selected: v
              {
                versions.find((v) => v.id.toString() === selectedVersionId)
                  ?.version
              }
            </span>
          )}
        </div>
      </div>

      {/* Model Versions Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Model Versions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <MemoizedDataTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

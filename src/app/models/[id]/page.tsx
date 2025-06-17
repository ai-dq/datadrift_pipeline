'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModel } from '@/hooks/network/models';
import { use } from 'react';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Model } from '@/entities/ml-model';

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
  const { id } = use(params);
  const { data: versions, loading: modelLoading } = useModel(Number(id));

  const model = use(searchParams);

  if (modelLoading) {
    return <ModelVersionPageSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{model.name}</h1>
        <p className="text-sm text-gray-600">ID: {id}</p>
      </div>

      {/* Model Versions Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Model Versions
              </CardTitle>
              <CardDescription>Versions of the model</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable data={versions} columns={columns} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

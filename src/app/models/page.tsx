'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiModelResponse, getModels } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils/time';
import { columns, Model } from './columns';
import { DataTable } from './data-table';

// Transform API model to UI Model
function transformResponseToEntity(response: ApiModelResponse): Model {
  return {
    id: response.id.toString(),
    name: response.name,
    type: response.type,
    version: response.version,
    updatedAt: formatRelativeTime(response.updated_at),
    description: response.description || undefined,
  };
}

async function getModelsData(): Promise<Model[]> {
  try {
    const response = await getModels();
    return response.items.map(transformResponseToEntity);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return [];
  }
}

export default async function ModelsPage() {
  const data = await getModelsData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Overview</CardTitle>
          <CardDescription>List of all models</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={data} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { StatCard } from '@/components/stat-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiModelResponse, getModels } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils/time';
import { ColumnFiltersState, OnChangeFn } from '@tanstack/react-table';
import { Activity, CreditCard, Search, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { columns, Model } from './columns';
import { DataTable } from './data-table';

/**
 * Transform API model to UI Model
 */
function transformResponseToEntity(response: ApiModelResponse): Model {
  return {
    id: response.id.toString(),
    name: response.name,
    type: response.type,
    version: response.version,
    updatedAt: formatRelativeTime(response.updated_at),
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

export default function ModelsPage() {
  const [data, setData] = useState<Model[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (
    updater,
  ) => {
    setColumnFilters((prev) =>
      typeof updater === 'function' ? updater(prev) : updater,
    );
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const modelsData = await getModelsData();
        setData(modelsData);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    }

    fetchData();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Models</h1>
        <p className="text-sm text-gray-600">Models</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="OCR"
          description="Number of OCR models"
          value={data.filter((model) => model.type.startsWith('ocr')).length}
          icon={Users}
        />
        <StatCard
          title="Layout Detection"
          description="Number of Layout Detection models"
          value={data.filter((model) => model.type === 'layout').length}
          icon={Activity}
        />
        <StatCard
          title="Extraction"
          description="Number of Extraction models"
          value={data.filter((model) => model.type === 'tabrec').length}
          icon={CreditCard}
        />
      </div>

      {/* Models Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Model Overview
                </CardTitle>
                <CardDescription>List of all models</CardDescription>
              </div>
              <div className="flex items-center">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 size-4 text-gray-400" />
                  <Input
                    placeholder="Search model name..."
                    value={
                      (columnFilters.find((f) => f.id === 'name')
                        ?.value as string) ?? ''
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      handleColumnFiltersChange((prev) =>
                        value
                          ? prev
                              .filter((f) => f.id !== 'name')
                              .concat([{ id: 'name', value }])
                          : prev.filter((f) => f.id !== 'name'),
                      );
                    }}
                    className="pl-10 pr-10 w-64 focus:w-80 transition-all duration-200"
                  />
                  {(columnFilters.find((f) => f.id === 'name')
                    ?.value as string) && (
                    <button
                      onClick={() => {
                        handleColumnFiltersChange((prev) =>
                          prev.filter((f) => f.id !== 'name'),
                        );
                      }}
                      className="absolute right-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={data}
              columns={columns}
              columnFilters={columnFilters}
              onColumnFiltersChange={handleColumnFiltersChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

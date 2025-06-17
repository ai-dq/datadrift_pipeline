import { ModelVersion } from '@/entities/ml-model';
import { ColumnDef } from '@tanstack/react-table';

export const columns: ColumnDef<ModelVersion>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 100,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => {
      const version = row.getValue('version') as ModelVersion['version'];
      return <div className="font-mono text-sm">v{version}</div>;
    },
    size: 100,
  },
  {
    accessorKey: 'trainedAt',
    header: 'Trained At',
  },
];

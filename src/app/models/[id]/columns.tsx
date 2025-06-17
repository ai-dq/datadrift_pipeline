import { ModelVersion } from '@/entities/ml-model';
import { ColumnDef } from '@tanstack/react-table';

const SelectCell = ({ row }: { row: any }) => {
  return <div className="font-mono text-sm">${row.original.id}</div>;
};

export const columns: ColumnDef<ModelVersion>[] = [
  {
    id: 'actions',
    cell: ({ row }) => <SelectCell row={row} />,
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
  {
    accessorKey: 'epochs',
  },
  {
    accessorKey: 'time',
  },
  {
    accessorKey: 'precision',
  },
  {
    accessorKey: 'recall',
  },
  {
    accessorKey: 'map50',
  },
  {
    accessorKey: 'map95',
  },
];

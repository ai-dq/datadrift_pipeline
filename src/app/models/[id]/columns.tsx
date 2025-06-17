import { Button } from '@/components/ui/button';
import { Model, ModelVersion } from '@/entities/ml-model';
import { cn } from '@/utils/tailwind.util';
import { ColumnDef } from '@tanstack/react-table';
import { Check } from 'lucide-react';

const SelectCell = ({
  row,
  model,
  isSelected,
  onSelect,
}: {
  row: any;
  model: Model;
  isSelected: boolean;
  onSelect: (versionId: string) => void;
}) => {
  const version = row.original as ModelVersion;

  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'h-8 w-8 p-0 rounded-full transition-all',
        isSelected
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'hover:bg-gray-100',
      )}
      onClick={() => onSelect(version.id.toString())}
    >
      {isSelected ? (
        <Check className="h-4 w-4" />
      ) : (
        <div className="h-2 w-2 rounded-full bg-gray-400" />
      )}
    </Button>
  );
};

export const columns = (
  model: Model,
  selectedVersionId: string | null,
  onVersionSelect: (versionId: string) => void,
): ColumnDef<ModelVersion>[] => [
  {
    id: 'select',
    header: 'Select',
    cell: ({ row }) => (
      <SelectCell
        row={row}
        model={model}
        isSelected={selectedVersionId === row.original.id.toString()}
        onSelect={onVersionSelect}
      />
    ),
    size: 80,
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

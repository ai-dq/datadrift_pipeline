import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModelVersion } from '@/entities/ml-model';
import { cn } from '@/utils/tailwind.util';
import { ColumnDef, Row } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import { useState } from 'react';

const SelectCell = <TData extends ModelVersion>({
  row,
  isSelected,
  onSelect,
  className,
}: {
  row: Row<TData>;
  isSelected: boolean;
  onSelect: (versionId: string) => void;
  className?: string;
}) => {
  const version = row.original;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={className}>
      <Button
        variant="ghost"
        className={cn(
          'transition-all duration-300 border-none outline-none focus:outline-none hover:scale-100 active:scale-100',
          isSelected
            ? 'h-auto w-auto p-1 rounded-md'
            : 'h-8 w-8 p-0 rounded-full cursor-pointer',
          isSelected ? '' : isHovered ? 'bg-gray-100 opacity-100' : 'opacity-0',
        )}
        onClick={() => onSelect(version.id.toString())}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        aria-label="Select version button"
      >
        {isSelected ? (
          <Badge
            variant="secondary"
            className="bg-teal-50 text-green-800 text-xs px-2 py-1"
          >
            <Check className="h-3 w-3" />
            Current
          </Badge>
        ) : (
          <div
            className={cn(
              'rounded-full bg-gray-400 transition-all duration-300 ease-in-out',
              isHovered ? 'h-3 w-3' : 'h-2 w-2',
            )}
          />
        )}
      </Button>
    </div>
  );
};

export const columns = <TData extends ModelVersion>(
  selectedVersionId: string | null,
  onVersionSelect: (versionId: string) => void,
): ColumnDef<TData>[] => [
  {
    id: 'select',
    header: ({}) => (
      <div
        className="flex items-center justify-center"
        aria-label="Select version header"
      >
        <Check className="w-4 h-4" />
      </div>
    ),
    cell: ({ row }) => (
      <SelectCell
        row={row}
        isSelected={selectedVersionId === row.original.id.toString()}
        onSelect={onVersionSelect}
        className="flex justify-center items-center"
        aria-label="Select version cell"
      />
    ),
    minSize: 50,
    maxSize: 60,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => {
      const version = row.original.version;
      return <div className="font-mono text-sm">v{version}</div>;
    },
    minSize: 150,
  },
  {
    accessorKey: 'epochs',
    header: 'Epochs',
    minSize: 50,
  },
  {
    accessorKey: 'time',
    header: 'Training Time',
    minSize: 50,
  },
  {
    accessorKey: 'precision',
    header: 'Precision',
    minSize: 60,
  },
  {
    accessorKey: 'recall',
    header: 'Recall',
    minSize: 60,
  },
  {
    accessorKey: 'map50',
    header: 'mAP50',
    minSize: 60,
  },
  {
    accessorKey: 'map95',
    header: 'mAP50-95',
    minSize: 60,
  },
  {
    accessorKey: 'trainedAt',
    header: 'Trained At',
  },
];

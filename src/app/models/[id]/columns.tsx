import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModelVersion } from '@/entities/ml-model';
import { cn } from '@/utils/tailwind.util';
import { ColumnDef, Row } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

const SelectCell = memo(
  ({
    row,
    isSelected,
    onSelect,
    className,
  }: {
    row: Row<ModelVersion>;
    isSelected: boolean;
    onSelect: (version: string) => void;
    className?: string;
  }) => {
    const version = row.original.version;
    const [isHovered, setIsHovered] = useState(false);

    const handleSelect = useCallback(() => {
      onSelect(version);
    }, [onSelect, version]);

    const handlePointerEnter = useCallback(() => {
      setIsHovered(true);
    }, []);

    const handlePointerLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    const buttonClassName = useMemo(
      () =>
        cn(
          'transition-all duration-300 border-none outline-none focus:outline-none hover:scale-100 active:scale-100',
          isSelected
            ? 'h-auto w-auto p-1 rounded-md'
            : 'h-8 w-8 p-0 rounded-full cursor-pointer',
          isSelected ? '' : isHovered ? 'bg-gray-100 opacity-100' : 'opacity-0',
        ),
      [isSelected, isHovered],
    );

    const dotClassName = useMemo(
      () =>
        cn(
          'rounded-full bg-gray-400 transition-all duration-300 ease-in-out',
          isHovered ? 'h-3 w-3' : 'h-2 w-2',
        ),
      [isHovered],
    );

    return (
      <div className={className}>
        <Button
          variant="ghost"
          className={buttonClassName}
          onClick={handleSelect}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
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
            <div className={dotClassName} />
          )}
        </Button>
      </div>
    );
  },
);
SelectCell.displayName = 'SelectCell';

const SelectHeader = memo(() => (
  <div
    className="flex items-center justify-center"
    aria-label="Select version header"
  >
    <Check className="w-4 h-4" />
  </div>
));
SelectHeader.displayName = 'SelectHeader';

const VersionCell = memo(({ row }: { row: Row<ModelVersion> }) => {
  const version = row.original.version;
  return <div className="font-mono text-sm">v{version}</div>;
});
VersionCell.displayName = 'VersionCell';

const TrainedAtCell = memo(({ row }: { row: Row<ModelVersion> }) => {
  return <div>{row.original.trainedAt}</div>;
});
TrainedAtCell.displayName = 'TrainedAtCell';

export const columns = (
  selectedVersion: string | null,
  onVersionSelect: (version: string) => void,
): ColumnDef<ModelVersion>[] => [
  {
    id: 'select',
    header: () => <SelectHeader />,
    cell: ({ row }) => (
      <SelectCell
        row={row}
        isSelected={selectedVersion === row.original.version}
        onSelect={onVersionSelect}
        className="flex justify-center items-center"
        aria-label="Select version cell"
      />
    ),
    minSize: 60,
    maxSize: 80,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <VersionCell row={row} />,
    minSize: 120,
  },
  {
    accessorKey: 'epochs',
    header: 'Epochs',
    minSize: 60,
  },
  {
    accessorKey: 'time',
    header: 'Training Time',
    minSize: 60,
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

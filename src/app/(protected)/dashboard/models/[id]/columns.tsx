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
          'h-8 w-8 p-0 transition-all duration-300 border-none outline-none focus:outline-none hover:scale-100 active:scale-100',
          isSelected ? 'rounded-md' : 'rounded-full cursor-pointer',
          isSelected
            ? ''
            : isHovered
              ? 'bg-gray-100 opacity-100'
              : 'bg-gray-50 opacity-50',
        ),
      [isSelected, isHovered],
    );

    const dotClassName = useMemo(
      () =>
        cn(
          'rounded-full bg-gray-400 transition-all duration-400 ease-in-out',
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
            <Check className="size-5 text-teal-600 font-bold animate-in zoom-in-75 duration-400" />
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

const MetricsCell = memo(({ metric }: { metric: number | null }) => {
  return <div>{metric || '-'}</div>;
});
MetricsCell.displayName = 'MetricsCell';

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
        className="flex justify-center-safe"
        aria-label="Select version cell"
      />
    ),
    minSize: 50,
    maxSize: 50,
  },
  {
    header: 'Version',
    cell: ({ row }) => <VersionCell row={row} />,
    minSize: 80,
    maxSize: 80,
  },
  {
    header: 'Epochs',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    header: 'Training Time',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    header: 'Precision',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    header: 'Recall',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    header: 'mAP50',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    header: 'mAP50-95',
    cell: ({ row }) => (
      <MetricsCell metric={row.original.trainingMetrics.epochs} />
    ),
    minSize: 60,
  },
  {
    accessorKey: 'trainedAt',
    header: 'Trained At',
  },
];

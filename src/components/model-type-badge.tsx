import { ModelType } from '@/entities/ml-model';
import { Badge } from './ui/badge';

const typeStyleMap: Record<
  ModelType,
  { bg: string; text: string; hover: string }
> = {
  [ModelType.LAYOUT]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200',
  },
  [ModelType.OCRCLS]: {
    bg: 'bg-lime-100',
    text: 'text-lime-800',
    hover: 'hover:bg-lime-200',
  },
  [ModelType.OCRDET]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
  },
  [ModelType.OCRREC]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    hover: 'hover:bg-emerald-200',
  },
  [ModelType.TABREC]: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    hover: 'hover:bg-indigo-200',
  },
};

type HoverStyle = 'plain' | 'highlight';

export default function ModelTypeBadge({
  type,
  hover = 'highlight',
}: {
  type: ModelType;
  hover?: HoverStyle;
}) {
  const style = typeStyleMap[type] ?? {
    bg: 'bg-gray-500',
    text: 'text-gray-50',
    hover: 'hover:bg-gray-600',
  };
  return (
    <Badge
      className={`font-bold ${style.bg} ${style.text} ${hover === 'highlight' ? style.hover : ''}`}
    >
      {ModelType.presentationName(type)}
    </Badge>
  );
}

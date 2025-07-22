import { ModelType } from '@/entities/ml-model';

interface ModelTypeColor {
  background: string;
  text: string;
  bgHover: string;
}

export const ModelTypeColors: Record<ModelType, ModelTypeColor> = {
  [ModelType.LAYOUT]: {
    background: 'bg-orange-500/90',
    text: 'text-white',
    bgHover: 'hover:bg-orange-500/60',
  },
  [ModelType.OCRCLS]: {
    background: 'bg-sky-500/90',
    text: 'text-white',
    bgHover: 'hover:bg-sky-500/60',
  },
  [ModelType.OCRDET]: {
    background: 'bg-blue-500/90',
    text: 'text-white',
    bgHover: 'hover:bg-blue-500/60',
  },
  [ModelType.OCRREC]: {
    background: 'bg-indigo-500/90',
    text: 'text-white',
    bgHover: 'hover:bg-indigo-500/60',
  },
  [ModelType.TABREC]: {
    background: 'bg-teal-500/90',
    text: 'text-white',
    bgHover: 'hover:bg-teal-500/60',
  },
};

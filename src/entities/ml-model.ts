export type Model = {
  id: string;
  name: string;
  type: 'layout' | 'ocrcls' | 'ocrrec' | 'ocrdet' | 'tabrec';
  version: string;
  updatedAt: string;
  description: string | null;
};

export type ModelVersion = {
  version: string;
  trainedAt: string;
};

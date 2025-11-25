import { ModelType } from './ml-model';

export interface Project {
  id: string;
  title: string;
  type: ModelType;
}

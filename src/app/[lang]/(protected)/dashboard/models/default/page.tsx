'use client';

import { useState } from 'react';
import {
  Activity,
  CpuIcon,
  Eye,
  FileText,
  TableIcon,
  Star,
  StarOff,
  Clock,
  Database,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/tailwind.util';
import PageHeader from '@/components/models/page-header';

// Primary page content
const modelTypes = [
  {
    id: 'layout-detection',
    name: 'Layout Detection',
    icon: CpuIcon,
    description: 'Detect and analyze document layouts',
    currentModel: 'RTDETR',
    version: 'v1.1.0',
  },
  {
    id: 'ocr-recognition',
    name: 'OCR Recognition',
    icon: Eye,
    description: 'Optical character recognition',
    currentModel: 'PP-OCRv5_rec_finetune',
    version: 'v0.1.0',
  },
  {
    id: 'ocr-detection',
    name: 'OCR Detection',
    icon: FileText,
    description: 'Text detection in images',
    currentModel: 'PP-OCRv4_det_server',
    version: 'v0.1.0',
  },
  {
    id: 'table-recognition',
    name: 'Table Recognition',
    icon: TableIcon,
    description: 'Extract and analyze table structures',
    currentModel: 'SLANET_PLUS',
    version: 'v0.1.0',
  },
];

const availableModels = [
  {
    id: '1',
    name: 'RTDETR',
    version: 'v1.1.0',
    type: 'layout-detection',
    dataset: 'Custom',
    mAP50: 0.914,
    updatedAt: '2 days ago',
    isActive: true,
    description: 'Real-time detection transformer for layout analysis',
    parameters: '50M',
    accuracy: 91.4,
    inferenceTime: '45ms',
  },
  {
    id: '2',
    name: 'PP_DocLayout',
    version: 'v0.1.0',
    type: 'layout-detection',
    dataset: 'Custom',
    mAP50: 0.888,
    updatedAt: '1 week ago',
    isActive: false,
    description: 'PaddlePaddle document layout analysis model',
    parameters: '42M',
    accuracy: 88.8,
    inferenceTime: '52ms',
  },
  {
    id: '3',
    name: 'DocLayout_YOLO',
    version: 'v0.1.0',
    type: 'layout-detection',
    dataset: 'Custom',
    mAP50: 0.872,
    updatedAt: '2 weeks ago',
    isActive: false,
    description: 'YOLO-based document layout detection',
    parameters: '38M',
    accuracy: 87.2,
    inferenceTime: '38ms',
  },
];

export default function ModelsDefaultPage() {
  const defaultModelType = modelTypes[0];
  if (!defaultModelType) {
    throw new Error('Model types are not configured.');
  }

  const defaultModel = availableModels[0];
  if (!defaultModel) {
    throw new Error('Available models are not configured.');
  }

  const [selectedModelType, setSelectedModelType] = useState(defaultModelType);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = availableModels.filter(
    (model) =>
      selectedModelType &&
      model.type === selectedModelType.id &&
      model.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Model Management"
        subtitle="Manage and monitor your AI models"
        icon={Activity}
      />

      <div className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Model Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modelTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Card
                  key={type.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent/50',
                    selectedModelType.id === type.id
                      ? 'ring-2 ring-primary'
                      : '',
                  )}
                  onClick={() => setSelectedModelType(type)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base">{type.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{type.currentModel}</span>
                      <Badge variant="secondary">{type.version}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Model Details</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedModel.name}
                      <Badge
                        variant={
                          selectedModel.isActive ? 'default' : 'secondary'
                        }
                      >
                        {selectedModel.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedModel.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{selectedModel.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Dataset
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedModel.dataset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      mAP50
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedModel.mAP50}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Parameters
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedModel.parameters}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Inference Time
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedModel.inferenceTime}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Accuracy</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedModel.accuracy}%
                    </p>
                  </div>
                  <Progress value={selectedModel.accuracy} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Updated {selectedModel.updatedAt}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Available Models</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedModelType.name} Models
                </CardTitle>
                <CardDescription>
                  {filteredModels.length} models available
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {filteredModels.map((model, index) => (
                    <div key={model.id}>
                      <div
                        className={cn(
                          'p-4 cursor-pointer hover:bg-accent/50 transition-colors',
                          selectedModel.id === model.id ? 'bg-accent' : '',
                        )}
                        onClick={() => setSelectedModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {model.version}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>mAP50: {model.mAP50}</span>
                              <span>{model.updatedAt}</span>
                            </div>
                          </div>
                          {model.isActive && (
                            <Badge variant="default" className="ml-2">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      {index < filteredModels.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Additional components provided
export interface Model {
  id: string;
  name: string;
  version: string;
  type: string;
  dataset: string;
  mAP50: number;
  updatedAt: string;
  isActive: boolean;
  description: string;
  parameters: string;
  accuracy: number;
  inferenceTime: string;
}

interface ModelDetailsProps {
  model: Model;
}

function ModelDetails({ model }: ModelDetailsProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-foreground">
              {model.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {model.description}
            </p>
          </div>
          <Badge
            variant={model.isActive ? 'default' : 'secondary'}
            className="ml-4"
          >
            {model.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Activity className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {model.accuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Database className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {model.parameters}
            </div>
            <div className="text-xs text-muted-foreground">Parameters</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {model.inferenceTime}
            </div>
            <div className="text-xs text-muted-foreground">Inference</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {model.updatedAt}
            </div>
            <div className="text-xs text-muted-foreground">Updated</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Performance Metrics</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">mAP50</span>
                <span className="font-medium text-foreground">
                  {model.mAP50.toFixed(3)}
                </span>
              </div>
              <Progress value={model.mAP50 * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-medium text-foreground">
                  {model.accuracy.toFixed(1)}%
                </span>
              </div>
              <Progress value={model.accuracy} className="h-2" />
            </div>
          </div>
        </div>

        {/* Model Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <div className="text-sm text-muted-foreground">Version</div>
            <div className="font-medium text-foreground">{model.version}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Dataset</div>
            <div className="font-medium text-foreground">{model.dataset}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelListProps {
  models: Model[];
  selectedModel: Model;
  onModelSelect: (model: Model) => void;
}

function ModelList({ models, selectedModel, onModelSelect }: ModelListProps) {
  return (
    <div className="space-y-3">
      {models.map((model) => (
        <Card
          key={model.id}
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-sm border',
            selectedModel.id === model.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
          )}
          onClick={() => onModelSelect(model)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">
                    {model.name}
                  </h4>
                  {model.isActive && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{model.version}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-primary"
              >
                {model.isActive ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">mAP50:</span>
                <span className="font-medium text-foreground">
                  {model.mAP50.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Dataset:</span>
                <span className="font-medium text-foreground">
                  {model.dataset}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium text-foreground">
                  {model.updatedAt}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export interface ModelType {
  id: string;
  name: string;
  icon: string;
  description: string;
  currentModel: string;
  version: string;
}

export interface ModelTypeSelectorProps {
  modelTypes: ModelType[];
  selectedType: ModelType;
  onTypeSelect: (type: ModelType) => void;
}

function ModelTypeSelector({
  modelTypes,
  selectedType,
  onTypeSelect,
}: ModelTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modelTypes.map((type) => (
        <Card
          key={type.id}
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
            selectedType.id === type.id
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50',
          )}
          onClick={() => onTypeSelect(type)}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">{type.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {type.name}
                  </h3>
                  {selectedType.id === type.id && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {type.description}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Current Model:
                    </span>
                    <span className="font-medium text-foreground">
                      {type.currentModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium text-foreground">
                      {type.version}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

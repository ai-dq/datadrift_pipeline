'use client';

import ModelTypeBadge from '@/components/model-type-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModelType } from '@/entities/ml-model';
import { useTrainingSetup } from '@/hooks/train/use-training-setup';
import { cn } from '@/lib/utils/tailwind.util';
import {
  BrainCircuit,
  Check,
  Database,
  Loader2,
  Play,
  Settings2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export default function ModelTrainingPage() {
  const [hyperParams, setHyperParams] = useState({
    learningRate: '0.001',
    batchSize: '32',
    epochs: '10',
    optimizer: 'adam',
  });

  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [trainingLoss, setTrainingLoss] = useState<number | null>(null);

  const tasks = useMemo(() => {
    return ModelType.allCases().map((type) => {
      return {
        id: type,
        name: type,
      };
    });
  }, []);

  const {
    selectedType,
    selectedProject,
    selectedModel,
    selectedVersion,
    availableProjects,
    availableModels,
    availableVersions,
    setSelectedType,
    setSelectedProject,
    setSelectedModel,
    setSelectedVersion,
  } = useTrainingSetup();

  // useEffect(() => {
  //   console.debug('Selected Model Data updated');
  //   const modelID = selectedModelData?.id;
  //   if (!modelID) return;

  //   const { data: modelVersions } = useModelVersions(Number(modelID));

  //   console.log(modelVersions);
  //   setModelVersions(modelVersions);
  // }, [selectedModelData, modelVersions]);

  const startTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setTrainingStatus('Initializing training...');

    // Simulate training progress
    const totalEpochs = Number.parseInt(hyperParams.epochs);
    let epoch = 0;

    const interval = setInterval(() => {
      epoch++;
      const progress = (epoch / totalEpochs) * 100;
      setTrainingProgress(progress);
      setCurrentEpoch(epoch);
      setTrainingLoss(Math.random() * 2 + 0.1); // Random loss for demo

      if (epoch < totalEpochs) {
        setTrainingStatus(`Training epoch ${epoch}/${totalEpochs}...`);
      } else {
        setTrainingStatus('Training completed!');
        setIsTraining(false);
        clearInterval(interval);
      }
    }, 1000); // Update every second for demo
  };

  const canStartTraining =
    selectedType && selectedProject && selectedModel && selectedVersion;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Model Training</h1>
        <p className="text-muted-foreground">
          Configure your training setup by selecting data, model, and
          hyperparameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Selections */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>

          {/* Task Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Task Selection
              </CardTitle>
              <CardDescription>
                Choose the machine learning task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="task">Task Type</Label>
                <Select
                  key={selectedType || undefined}
                  value={selectedType || undefined}
                  onValueChange={(value) => {
                    const type = ModelType.fromString(value);
                    setSelectedType(type);
                  }}
                  disabled={isTraining}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.name}>
                        {ModelType.presentationName(task.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Selection
              </CardTitle>
              <CardDescription>Choose a labeling project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="project">Labeling Project</Label>
                <Select
                  key={selectedProject?.id}
                  value={selectedProject?.id}
                  onValueChange={setSelectedProject}
                  disabled={!selectedType || isTraining}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedType
                          ? 'Select a labeling project'
                          : 'Select a task first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center justify-between w-full">
                          <span key={project.id}>{project.title}</span>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary">
                              {project.finishedTasksCount.toLocaleString()}{' '}
                              samples
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                Model Selection
              </CardTitle>
              <CardDescription>
                Choose model architecture and version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model Architecture</Label>
                  <Select
                    key={selectedModel?.id}
                    value={selectedModel?.id}
                    onValueChange={setSelectedModel}
                    disabled={!selectedType || isTraining}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedType
                            ? 'Select a model'
                            : 'Select a task first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div key={model.id}>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {model.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedModel && (
                  <div className="space-y-2">
                    <Label htmlFor="version">Model Version</Label>
                    <Select
                      key={selectedVersion?.version}
                      value={selectedVersion?.version}
                      onValueChange={setSelectedVersion}
                      disabled={isTraining}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a version" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVersions.map((version) => (
                          <SelectItem
                            key={version.version}
                            value={version.version}
                          >
                            {version.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Hyperparameters & Training */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Training Setup</h2>

          {/* Hyperparameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Hyperparameters
              </CardTitle>
              <CardDescription>Configure training parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="learning-rate">Learning Rate</Label>
                  <Input
                    id="learning-rate"
                    type="number"
                    step="0.0001"
                    value={hyperParams.learningRate}
                    onChange={(e) =>
                      setHyperParams((prev) => ({
                        ...prev,
                        learningRate: e.target.value,
                      }))
                    }
                    disabled={isTraining}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={hyperParams.batchSize}
                    onChange={(e) =>
                      setHyperParams((prev) => ({
                        ...prev,
                        batchSize: e.target.value,
                      }))
                    }
                    disabled={isTraining}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="epochs">Epochs</Label>
                  <Input
                    id="epochs"
                    type="number"
                    value={hyperParams.epochs}
                    onChange={(e) =>
                      setHyperParams((prev) => ({
                        ...prev,
                        epochs: e.target.value,
                      }))
                    }
                    disabled={isTraining}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimizer">Optimizer</Label>
                  <Select
                    value={hyperParams.optimizer}
                    onValueChange={(value) =>
                      setHyperParams((prev) => ({ ...prev, optimizer: value }))
                    }
                    disabled={isTraining}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adam">Adam</SelectItem>
                      <SelectItem value="sgd">SGD</SelectItem>
                      <SelectItem value="rmsprop">RMSprop</SelectItem>
                      <SelectItem value="adamw">AdamW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Summary & Start Button */}
          <Card>
            <CardHeader>
              <CardTitle>Training Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Task:</span>
                    <p className="text-muted-foreground">
                      {selectedType
                        ? ModelTypeBadge({
                            type: selectedType,
                            hover: 'plain',
                          })
                        : 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Data:</span>
                    <p className="text-muted-foreground">
                      {selectedProject
                        ? availableProjects.find((p) => p === selectedProject)
                            ?.title
                        : 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <p className="text-muted-foreground">
                      {selectedModel || selectedVersion
                        ? `${selectedModel?.name ?? ''}${selectedVersion ? '-' + selectedVersion.version : ''}`
                        : 'Not selected'}
                    </p>
                  </div>
                </div>

                {(isTraining || trainingProgress > 0) && (
                  <div>
                    <div className="flex items-center gap-2">
                      {isTraining ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Check className="size-5" />
                      )}
                      Training Status
                    </div>

                    <div className="space-y-4">
                      <div className="text-gray-500 text-xs">
                        {trainingStatus}
                      </div>
                      <Progress value={trainingProgress} max={100} />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Current Epoch:</span>
                          <p className="text-muted-foreground">
                            {currentEpoch}/{hyperParams.epochs}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Training Loss:</span>
                          <p className="text-muted-foreground">
                            {trainingLoss ? trainingLoss.toFixed(4) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-0.5" />

                <Button
                  className={cn(
                    'w-full h-12 rounded-xl font-semibold',
                    isTraining ? 'cursor-progress' : 'cursor-pointer',
                  )}
                  size="lg"
                  disabled={!canStartTraining || isTraining}
                  onClick={startTraining}
                >
                  <Play className="mr-2 size-4 fill-primary-foreground" />
                  {isTraining ? 'Training in Progress...' : 'Start Training'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

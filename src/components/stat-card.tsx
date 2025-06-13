import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

interface ModelStatCardProps {
  title: string;
  description: string;
  value: number;
  icon: React.ElementType;
}

export function StatCard({
  title,
  description,
  value,
  icon: Icon,
}: ModelStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <CardTitle>{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

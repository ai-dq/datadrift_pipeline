import { Bot, Settings2 } from 'lucide-react';

import { GradioIcon, LabelStudioIcon, SwaggerIcon } from '@/components/icons';
import type { MenuItem, ServiceItem } from './types';

export const services: ServiceItem[] = [
  {
    title: 'LabelStudio',
    url: '/dashboard/labelstudio',
    icon: LabelStudioIcon,
  },
  {
    title: 'API docs',
    url: '/dashboard/swagger',
    icon: SwaggerIcon,
  },
  {
    title: 'Demo',
    url: '/dashboard/gradio',
    icon: GradioIcon,
  },
];

export const menuItems: MenuItem[] = [
  {
    title: 'Label Studio',
    url: '/dashboard/projects',
    icon: Settings2,
    isActive: true,
    children: [
      {
        title: 'Projects',
        url: '#',
      },
    ],
  },
  {
    title: 'Models',
    url: '/models',
    icon: Bot,
    isActive: true,
    children: [
      {
        title: 'Versions',
        url: '#',
      },
      {
        title: 'Logs',
        url: '#',
      },
    ],
  },
];

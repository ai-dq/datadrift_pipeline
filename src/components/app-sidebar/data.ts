import { Bot } from 'lucide-react';

import { GradioIcon, LabelStudioIcon, SwaggerIcon } from '@/components/icons';
import { Settings2 } from 'lucide-react';
import type { MenuItem, ServiceItem } from './types';

export const services: ServiceItem[] = [
  {
    title: 'LabelStudio',
    url: '/services/labelstudio',
    icon: LabelStudioIcon,
  },
  {
    title: 'API docs',
    url: '/services/swagger',
    icon: SwaggerIcon,
  },
  {
    title: 'Demo',
    url: '/services/gradio',
    icon: GradioIcon,
  },
];

export const menuItems: MenuItem[] = [
  {
    title: 'Label Studio',
    url: '/labelstudio',
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

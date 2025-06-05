import { Bot } from 'lucide-react';

import { GradioIcon, LabelStudioIcon, SwaggerIcon } from '@/components/icons';
import type { MenuItem, ServiceItem } from './types';

export const services: ServiceItem[] = [
  {
    title: 'LabelStudio',
    url: process.env.LABEL_STUDIO_URL || 'http://localhost:9090',
    icon: LabelStudioIcon,
  },
  {
    title: 'API docs',
    url: process.env.CORE_API_SWAGGER_URL || 'http://localhost:9030/docs',
    icon: SwaggerIcon,
  },
  {
    title: 'Demo',
    url: process.env.CORE_DEMO_URL || 'http://localhost:9031',
    icon: GradioIcon,
  },
];

export const menuItems: MenuItem[] = [
  {
    title: 'Models',
    uri: '#',
    icon: Bot,
    isActive: false,
    children: [
      {
        title: 'Versions',
        uri: '#',
      },
      {
        title: 'Logs',
        uri: '#',
      },
    ],
  },
];

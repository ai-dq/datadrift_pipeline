import { Bot } from 'lucide-react';

import { GradioIcon, LabelStudioIcon, SwaggerIcon } from '@/components/icons';
import type { MenuItem, ServiceItem } from './types';

export const services: ServiceItem[] = [
  {
    title: 'LabelStudio',
    url: 'http://121.126.210.2/label-studio',
    icon: LabelStudioIcon,
  },
  {
    title: 'API docs',
    url: 'http://121.126.210.2/api/docs',
    icon: SwaggerIcon,
  },
  {
    title: 'Demo',
    url: 'http://121.126.210.2/demo',
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

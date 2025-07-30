import { BookOpen, BrainCircuit, Database, SquareTerminal } from 'lucide-react';

export const data = {
  user: {
    name: 'admin',
    email: 'qocr@admin.com',
    avatar: '/next.svg',
  },
  navMain: [
    {
      title: 'Data',
      url: '/dashboard/projects',
      icon: Database,
      isActive: true,
      items: [
        {
          title: 'Import',
          url: '#',
        },
        {
          title: 'Export',
          url: '#',
        },
      ],
    },
    {
      title: 'Models',
      url: '/dashboard/models',
      icon: BrainCircuit,
      items: [
        {
          title: 'Training',
          url: '#',
        },
      ],
    },
    {
      title: 'Monitoring',
      url: '#',
      icon: BookOpen,
      items: [
        {
          title: 'Default Models',
          url: '#',
        },
        {
          title: 'Training Status',
          url: '#',
        },
        {
          title: 'Logs',
          url: '#',
        },
      ],
    },
    {
      title: 'Playground',
      url: '/services/gradio',
      icon: SquareTerminal,
      items: [],
    },
  ],
  navSecondary: [],
};

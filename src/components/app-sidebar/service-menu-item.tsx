import { ExternalLink } from 'lucide-react';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { ServiceItem } from './types';

interface ServiceMenuItemProps {
  service: ServiceItem;
}

export const ServiceMenuItemComponent = ({ service }: ServiceMenuItemProps) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <a
        href={service.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full justify-between"
      >
        <div className="flex items-center gap-4">
          <service.icon className="size-4 flex-shrink-0" />
          <span className="text-sm">{service.title}</span>
        </div>
        <ExternalLink className="opacity-50" />
      </a>
    </SidebarMenuButton>
  </SidebarMenuItem>
);

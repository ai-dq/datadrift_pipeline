import Link from 'next/link';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { ServiceItem } from './types';

interface ServiceMenuItemProps {
  service: ServiceItem;
}

export const ServiceMenuItemComponent = ({ service }: ServiceMenuItemProps) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link href={service.url} className="flex w-full justify-between">
        <div className="flex items-center gap-4">
          <service.icon className="size-4 flex-shrink-0" />
          <span className="text-sm">{service.title}</span>
        </div>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
);

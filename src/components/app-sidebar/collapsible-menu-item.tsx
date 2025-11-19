import { ChevronRight } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { MenuItem } from './types';

interface CollapsibleMenuItemProps {
  item: MenuItem;
}

export const CollapsibleMenuItemComponent = ({
  item,
}: CollapsibleMenuItemProps) => (
  <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
    <SidebarMenuItem>
      <>
        <SidebarMenuButton asChild tooltip={item.title}>
          <a href={item.url} className="text-sm">
            <item.icon />
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
        {item.children.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <SidebarMenuSub>
                {item.children.map((child) => (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton asChild>
                      <a href={child.url} className="text-sm">
                        <span>{child.title}</span>
                      </a>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </>
    </SidebarMenuItem>
  </Collapsible>
);

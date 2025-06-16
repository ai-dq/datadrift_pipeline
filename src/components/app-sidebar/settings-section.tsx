import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { CollapsibleMenuItemComponent } from './collapsible-menu-item';
import { menuItems } from './data';

export const SettingsSection = () => (
  <SidebarGroup>
    <SidebarGroupLabel className="text-base">Settings</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {menuItems.map((item) => (
          <CollapsibleMenuItemComponent key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

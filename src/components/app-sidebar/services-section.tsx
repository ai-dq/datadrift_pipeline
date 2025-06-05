import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { services } from './data';
import { ServiceMenuItemComponent } from './service-menu-item';

export const ServicesSection = () => (
  <SidebarGroup>
    <SidebarGroupLabel>Services</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {services.map((service) => (
          <ServiceMenuItemComponent key={service.title} service={service} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

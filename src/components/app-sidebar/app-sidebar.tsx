import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ServicesSection } from './services-section';
import { SettingsSection } from './settings-section';
import { SidebarHeaderSection } from './sidebar-header-section';

export function AppSidebar() {
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeaderSection />
      <SidebarContent>
        <ServicesSection />
        <SettingsSection />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

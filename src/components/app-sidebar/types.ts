import { LucideIcon } from 'lucide-react';

export interface ServiceItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface MenuChildItem {
  title: string;
  url: string;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive: boolean;
  children: MenuChildItem[];
}

import React from 'react';
import {
  Activity,
  Terminal,
  FileText,
  Send,
  File,
  History,
  ShieldCheck,
  Bell,
  Globe,
  Tag,
  BarChart4,
  Shield,
  Wrench,
  Database,
  Clock,
  Settings,
  Users as UsersIcon
} from 'lucide-react';

export type ActiveView =
  | 'dashboard'
  | 'tester'
  | 'logs'
  | 'history'
  | 'users'
  | 'usage-history'
  | 'email-history'
  | 'schema'
  | 'limits'
  | 'mypage'
  | 'custom-tools'
  | 'access-tokens'
  | 'config'
  | 'email'
  | 'file-manager'
  | 'openapi'
  | 'openapi-meta'
  | 'openapi-stats'
  | 'openapi-limits'
  | 'db-backup'
  | 'scheduler'
  | 'otp-history'
  | 'notifications';

export interface MenuItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export interface MenuGroup {
  label?: string; // Group Header (Optional)
  items: MenuItem[];
}

export const menuStructure: MenuGroup[] = [
  {
    label: 'groupDashboard',
    items: [
      { id: 'dashboard', label: 'dashboard', icon: Activity }
    ]
  },
  {
    label: 'groupFunctions',
    items: [
      { id: 'tester', label: 'tester', icon: Terminal },
      { id: 'logs', label: 'logs', icon: FileText, adminOnly: true },
      { id: 'email', label: 'email', icon: Send },
      { id: 'file-manager', label: 'fileManager', icon: File }
    ]
  },
  {
    label: 'groupHistory',
    items: [
      { id: 'history', label: 'loginHistory', icon: History },
      { id: 'email-history', label: 'emailHistory', icon: FileText, adminOnly: true },
      { id: 'otp-history', label: 'otpHistory', icon: ShieldCheck, adminOnly: true },
      { id: 'notifications', label: 'notifications', icon: Bell, adminOnly: true }
    ]
  },
  {
    label: 'groupOpenApi',
    items: [
      { id: 'openapi', label: 'openapi', icon: Globe },
      { id: 'openapi-meta', label: 'openapiMeta', icon: Tag, adminOnly: true },
      { id: 'openapi-stats', label: 'openapiStats', icon: BarChart4, adminOnly: true },
      { id: 'openapi-limits', label: 'openapiLimits', icon: Shield, adminOnly: true }
    ]
  },
  {
    label: 'groupMcp',
    items: [
      { id: 'custom-tools', label: 'customTools', icon: Wrench, adminOnly: true },
      { id: 'usage-history', label: 'usageHistory', icon: BarChart4, adminOnly: true },
      { id: 'limits', label: 'limits', icon: Shield, adminOnly: true },
      { id: 'access-tokens', label: 'accessTokens', icon: Wrench, adminOnly: true }
    ]
  },
  {
    label: 'groupSystem',
    items: [
      { id: 'schema', label: 'schema', icon: Database, adminOnly: true },
      { id: 'db-backup', label: 'dbBackup', icon: Database, adminOnly: true },
      { id: 'scheduler', label: 'scheduler', icon: Clock, adminOnly: true },
      { id: 'config', label: 'config', icon: Settings, adminOnly: true },
      { id: 'users', label: 'users', icon: UsersIcon, adminOnly: true }
    ]
  }
];


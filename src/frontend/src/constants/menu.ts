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
    items: [
      { id: 'dashboard', label: '대시보드', icon: Activity }
    ]
  },
  {
    label: '기능',
    items: [
      { id: 'tester', label: '도구 테스터', icon: Terminal },
      { id: 'logs', label: '로그 뷰어', icon: FileText, adminOnly: true },
      { id: 'email', label: '메일 발송', icon: Send },
      { id: 'file-manager', label: '파일 관리', icon: File }
    ]
  },
  {
    label: '이력 조회',
    items: [
      { id: 'history', label: '접속 이력', icon: History },
      { id: 'email-history', label: '메일 발송 이력', icon: FileText, adminOnly: true },
      { id: 'otp-history', label: 'OTP 인증 이력', icon: ShieldCheck, adminOnly: true },
      { id: 'notifications', label: '알림 관리', icon: Bell, adminOnly: true }
    ]
  },
  {
    label: 'OpenAPI 관리',
    items: [
      { id: 'openapi', label: 'OpenAPI 목록/테스트', icon: Globe },
      { id: 'openapi-meta', label: 'OpenAPI 메타 관리', icon: Tag, adminOnly: true },
      { id: 'openapi-stats', label: 'OpenAPI 사용 통계', icon: BarChart4, adminOnly: true },
      { id: 'openapi-limits', label: 'OpenAPI 사용 제한', icon: Shield, adminOnly: true }
    ]
  },
  {
    label: 'MCP 도구 관리',
    items: [
      { id: 'custom-tools', label: '도구 생성/관리', icon: Wrench, adminOnly: true },
      { id: 'usage-history', label: '도구사용 이력', icon: BarChart4, adminOnly: true },
      { id: 'limits', label: '도구사용 제한 관리', icon: Shield, adminOnly: true },
      { id: 'access-tokens', label: '보안 토큰 관리', icon: Wrench, adminOnly: true }
    ]
  },
  {
    label: 'DB 및 시스템 관리',
    items: [
      { id: 'schema', label: 'DB 테이블 관리', icon: Database, adminOnly: true },
      { id: 'db-backup', label: 'DB 백업/복구', icon: Database, adminOnly: true },
      { id: 'scheduler', label: '스케줄러 관리', icon: Clock, adminOnly: true },
      { id: 'config', label: '시스템 설정', icon: Settings, adminOnly: true },
      { id: 'users', label: '사용자 관리', icon: UsersIcon, adminOnly: true }
    ]
  }
];

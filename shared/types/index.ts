// Shared TypeScript interfaces for AHSAS Portal

export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type MessageSender = 'unit' | 'admin';
export type UnitGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface Unit {
  id: string;
  user_id: string | null;
  name: string;
  class_name: string | null;
  org_name?: string | null;
  reg_no?: string | null;
  cluster?: string | null;
  zone?: string | null;
  address?: string | null; // Used for committee name in onboarding
  contact_info?: string | null;
  email?: string | null;
  grade: UnitGrade | string;
  total_score: number;
  fund_amount: number;
  total_members: number;
  created_at: string;
}

export interface Report {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  points_awarded: number;
  status: ReportStatus;
  submitted_at: string;
  reviewed_at: string | null;
  units?: Pick<Unit, 'name' | 'grade' | 'class_name'>;
}

export interface Member {
  id: string;
  unit_id: string;
  name: string;
  designation: string;
  created_at: string;
}

export interface Student {
  id: string;
  unit_id: string;
  name: string;
  dob?: string | null;
  father_name?: string | null;
  contact_number?: string | null;
  district?: string | null;
  address?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
}

export interface UnitMessage {
  id: string;
  unit_id: string;
  message: string;
  sender: MessageSender;
  created_at: string;
  units?: Pick<Unit, 'name'>;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

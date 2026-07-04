export type Role = "admin" | "member";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

export type TaskPriority = "low" | "med" | "high";
export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  is_personal: boolean;
  client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientStatus = "onboarding" | "in production" | "review" | "delivered" | "retainer";
export type PackageTier = "Launch Spark" | "Launch Engine" | "Custom";

export interface Client {
  id: string;
  company_name: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_handle: string | null;
  package_tier: PackageTier;
  deal_value: number;
  status: ClientStatus;
  start_date: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
}

export type LeadStage = "new" | "replied" | "touch_1" | "touch_2" | "call_booked" | "converted" | "dead";
export type LeadSource = "X" | "referral" | "email" | "other";

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  source: LeadSource;
  country: string | null;
  icp_fit: boolean;
  estimated_value: number;
  owner: string | null;
  stage: LeadStage;
  last_touch_date: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  halal_gate: boolean;
  flagged: boolean;
  deal_value: number | null;
  closed_at: string | null;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor: string | null;
  from_stage: string | null;
  to_stage: string | null;
  note: string | null;
  created_at: string;
}

export type GoalStatus = "not_started" | "in_progress" | "achieved";

export interface Goal {
  id: string;
  type: "milestone" | "revenue";
  title: string;
  description: string | null;
  target_date: string | null;
  status: GoalStatus;
  metric: string | null;
  target_amount: number | null;
  month: string | null;
  achieved_at: string | null;
}

export interface RevenueEntry {
  id: string;
  source: "pipeline" | "manual";
  amount: number;
  month: string;
  lead_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string | null;
  created_at: string;
}

export interface BoardList {
  id: string;
  board_id: string;
  name: string;
  position: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  board_id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  position: number;
  created_by: string | null;
}

export interface Comment {
  id: string;
  entity_type: "client" | "lead" | "card" | "task";
  entity_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

export interface FileMeta {
  id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string | null;
  folder: string;
  client_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

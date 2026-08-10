export type RoleType = "ceo" | "admin" | "employee";

export type Permissions = {
  canCreateProjects?: boolean;
  canEditTeam?: boolean;
  canFinalizeRecap?: boolean;
  canUploadDocuments?: boolean;
  canApproveDayOff?: boolean;
};

export type ManualUtilization = {
  weekStart: string;
  totalPct: number;
  status: string;
  breakdown: { projectId: string | null; pct: number; label?: string }[];
};

export type Person = {
  id: string;
  auth_user_id: string | null;
  name: string;
  role: string | null;
  role_type: RoleType;
  email: string | null;
  skills: string[];
  capacity_baseline: number | null;
  working_arrangement: string | null;
  active: boolean | null;
  ring_a: string | null;
  ring_b: string | null;
  solid: string | null;
  permissions: Permissions;
  manual_utilization: ManualUtilization | null;
  next_assessment_date: string | null;
  leave_balance_days: number;
  created_at: string;
};

export type ProjectType = "client" | "internal";
export type Priority = "high" | "medium" | "low";
export type ProgressManual = {
  enabled: boolean;
  value: number;
  reason: string;
  by: string | null;
  date: string;
};
export type ProgressManualLogEntry = ProgressManual & {
  restoredAt?: string;
  restoredBy?: string;
};
export type HealthValue = "on-track" | "at-risk" | "blocked";
export type HealthManual = { enabled: boolean; value: HealthValue };

export type Project = {
  id: string;
  name: string;
  type: ProjectType;
  client: string | null;
  category: string | null;
  priority: Priority;
  owner_id: string | null;
  start_date: string | null;
  end_date: string | null;
  next_deliverable: string | null;
  progress_manual: ProgressManual | null;
  progress_manual_log: ProgressManualLogEntry[];
  health_manual: HealthManual | null;
  created_at: string;
  updated_at: string;
  team_ids?: string[];
};

export type TaskStatus = "not-started" | "in-progress" | "done" | "blocked";
export type TaskStatusLabels = Partial<Record<TaskStatus, string>>;
export type ApprovalDecision = {
  status: "approved" | "rejected" | "info-requested";
  comment: string;
  decidedAt: string;
  decidedBy: string;
};

export type Task = {
  id: string;
  project_id: string;
  name: string;
  assignee_id: string | null;
  assignee2_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  start_date: string | null;
  priority: Priority;
  weight: number;
  workload_days: number;
  include_weekends: boolean;
  notes: string;
  blocker_reason: string;
  next_step: string;
  progress_pct: number | null;
  approval_person_id: string | null;
  dependency: string;
  remaining_days: number | null;
  approval_decision: ApprovalDecision | null;
  created_at: string;
  updated_at: string;
};

export type BlockerUrgency = "high" | "medium" | "low";
export type BlockerStatus = "open" | "resolved";

export type Blocker = {
  id: string;
  project_id: string;
  related_task_id: string | null;
  title: string;
  cause: string;
  impact: string;
  owner_id: string | null;
  urgency: BlockerUrgency;
  action_needed: string;
  suggested_solution: string;
  date_raised: string;
  status: BlockerStatus;
  created_at: string;
};

export type SupportRequestStatus = "open" | "accepted" | "resolved";

export type SupportRequest = {
  id: string;
  person_id: string;
  project_id: string | null;
  task_id: string | null;
  type: string;
  message: string;
  date: string;
  status: SupportRequestStatus;
  helper_id: string | null;
  accepted_date: string | null;
  comment: string;
  created_at: string;
};

export type AgreedPointStatus =
  | "agreed"
  | "pending"
  | "in-progress"
  | "completed"
  | "blocked";

export type AgreedPoint = {
  id: string;
  project_id: string | null;
  text: string;
  date: string;
  status: AgreedPointStatus;
  comment: string;
  source: { type: string; refId: string | null; label: string } | null;
  created_at: string;
  people_ids?: string[];
};

export type DayOffStatus = "pending" | "approved" | "rejected";

export type DayOff = {
  id: string;
  person_id: string;
  start_date: string;
  end_date: string;
  type: string | null;
  note: string;
  submitted_date: string;
  status: DayOffStatus;
  comment: string;
  decided_by: string | null;
  decided_date: string | null;
  employee_seen: boolean;
  created_at: string;
};

export type Document = {
  id: string;
  name: string;
  project_id: string | null;
  category: string;
  uploaded_by: string | null;
  upload_date: string;
  updated_date: string;
  file_note: string;
  tags: string[];
  folder: string | null;
  link_url: string | null;
  created_at: string;
};

export type ActivityKind =
  | "task_completed"
  | "task_created"
  | "document_uploaded"
  | "project_updated"
  | "dayoff_requested"
  | "dayoff_decided";

export type ActivityLogEntry = {
  id: string;
  kind: ActivityKind;
  actor_id: string | null;
  project_id: string | null;
  ref_id: string | null;
  title: string;
  detail: string | null;
  created_at: string;
};

export type Stage = "not-started" | "in-progress" | "done" | "blocked";
export type CapacityBand =
  | "available"
  | "balanced"
  | "almost-full"
  | "needs-support"
  | "overloaded";

export type WorkloadThresholds = {
  balanced: number;
  almostFull: number;
  needsSupport: number;
  overloaded: number;
};

export type PortalBranding = {
  logo_url?: string;
  primary_color?: string;
};

export type AppSettings = {
  id: number;
  workload_thresholds: WorkloadThresholds;
  recap_settings: { finalizeReminders?: boolean };
  working_days: number[];
  project_categories: string[];
  document_tags: string[];
  branding: PortalBranding;
  task_status_labels: TaskStatusLabels;
};

export type PublicHoliday = {
  id: string;
  date: string;
  name: string;
  created_at: string;
};

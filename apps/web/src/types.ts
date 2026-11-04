export type Role = 'STUDENT' | 'STAFF' | 'OFFICER' | 'ADMIN';
export type Status = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  categoryId: string;
  requesterId: string;
  officerId: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  requester?: User;
  officer?: User;
  logs?: {
    id: string;
    status: Status;
    note: string;
    actor: User;
    createdAt: string;
  }[];
  assignments?: {
    id: string;
    officer: User;
    assignedBy: User;
    assignedAt: string;
    endedAt: string | null;
  }[];
}
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface Dashboard {
  total: number;
  counts: Record<Status, number>;
}
export interface Report {
  total: number;
  completed: number;
  completionRate: number;
  byStatus: { status: Status; count: number }[];
  byCategory: { name: string; count: number }[];
  from: string | null;
  to: string | null;
}
export const roleLabels: Record<Role, string> = {
  STUDENT: 'Student',
  STAFF: 'Staff',
  OFFICER: 'Maintenance officer',
  ADMIN: 'Administrator',
};
export const statusLabels: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
export const statuses = Object.keys(statusLabels) as Status[];

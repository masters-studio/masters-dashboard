import { apiFetch } from './client';

/**
 * Mirrors GoalDto.java exactly. profitCenterId=null means a business-wide
 * goal spanning every profit centre (matches the nullable FK in the
 * schema) — not "no goal", a deliberate choice.
 */
export interface Goal {
  id: number;
  month: number; // 1-12
  year: number;
  profitCenterId: number | null;
  goalType: string;
  targetAmount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors GoalRequest.java exactly. goalType is plain free text, not
 * backed by a lookup table — the source spreadsheet uses four conventional
 * values (see GOAL_TYPE_SUGGESTIONS in GoalForm.tsx) but nothing on the
 * backend enforces them; treat those as convention, not a constraint,
 * exactly per GoalRequest's own javadoc.
 */
export interface GoalRequest {
  month: number;
  year: number;
  profitCenterId: number | null;
  goalType: string;
  targetAmount: number;
}

export interface GoalListFilters {
  month?: number;
  year?: number;
  profitCenterId?: number;
  goalType?: string;
}

export function listGoals(filters: GoalListFilters = {}): Promise<Goal[]> {
  const params = new URLSearchParams();
  if (filters.month != null) params.set('month', String(filters.month));
  if (filters.year != null) params.set('year', String(filters.year));
  if (filters.profitCenterId != null) params.set('profitCenterId', String(filters.profitCenterId));
  if (filters.goalType) params.set('goalType', filters.goalType);
  const query = params.toString();
  return apiFetch<Goal[]>(`/goals${query ? `?${query}` : ''}`);
}

export function getGoal(id: number): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${id}`);
}

export function createGoal(request: GoalRequest): Promise<Goal> {
  return apiFetch<Goal>('/goals', { method: 'POST', body: request });
}

export function updateGoal(id: number, request: GoalRequest): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${id}`, { method: 'PUT', body: request });
}

/**
 * A REAL delete, unlike every other domain in this app — goals has neither
 * an active flag nor a deleted_at column (safe because nothing else's
 * foreign key ever points at goals.id). Once deleted, it's gone from the
 * API entirely; callers should confirm with the strongest wording in the app.
 */
export function deleteGoal(id: number): Promise<void> {
  return apiFetch<void>(`/goals/${id}`, { method: 'DELETE' });
}

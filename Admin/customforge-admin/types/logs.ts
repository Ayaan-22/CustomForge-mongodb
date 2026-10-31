export type LogEntry = {
  requestId?: string;
  message?: string;
  level?: string;
  timestamp?: string;
  created_at?: string;
  adminId?: string;
  userId?: string;
  [key: string]: unknown;
};

export type LogPage = {
  status: string;
  timezone: string;
  filters: { date: string; level?: string; userId?: string; search?: string };
  pagination: { page: number; limit: number; total: number; pages: number };
  results: number;
  data: LogEntry[];
};

export type LogStats = {
  total: number;
  byLevel: Record<string, number>;
  byRoute: Record<string, number>;
  errorCount: number;
  averageResponseTime: number;
  uniqueUsers: number;
  date: string;
  timezone: string;
};

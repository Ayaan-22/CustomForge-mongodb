"use client";
import "../forge-operations.css";
import {useUrlState} from "@/hooks/use-url-state";
import type {AdminUserRow, AdminUserPayload} from "@/types/admin";
import {useAdminMutation} from "@/hooks/use-admin-mutation";
import { useConfirmation } from "@/hooks/use-confirmation";

import {useAdminQuery} from '@/hooks/use-admin-query';
import {useDebouncedValue} from '@/hooks/use-debounced-value';
import {QueryError} from '@/components/patterns/query-error';
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/patterns/section-header";
import { PageShell } from "@/components/patterns/page-shell";
import { ActionBar } from "@/components/patterns/action-bar";
import { Pagination } from "@/components/patterns/pagination";
import { EmptyState } from "@/components/patterns/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  User,
  Lock,
  Mail,
  CheckCircle,
  Eye,
  MapPin,
  CreditCard,
  ArrowUpDown,
  Search,
  Users,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserModal } from "../components/user-modal";
import { UserDetailsModal } from "../components/user-details-modal";
import { UserAddressesModal } from "../components/user-addresses-modal";
import { UserPaymentMethodsModal } from "../components/user-payment-methods-modal";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { INSIGHTS_COLORS, InsightsDataTable, InsightsTooltip, insightsShortDate } from "../components/dashboard-charts";

export default function UsersPage() {
  const { toast } = useToast();
  const runMutation = useAdminMutation();
  const { confirm, confirmationDialog } = useConfirmation();
  const [searchTerm, setSearchTerm] = useUrlState("searchTerm", "");
  const [roleFilter, setRoleFilter] = useUrlState("roleFilter", "all");
  const [activeFilter, setActiveFilter] = useUrlState("activeFilter", "all");
  const [sortBy, setSortBy] = useUrlState("sortBy", "created_at");
  const [sortOrder, setSortOrder] = useUrlState("sortOrder", "desc");
  const [page, setPage] = useUrlState("page", 1);
  const [limit] = useUrlState("limit", 10);


  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const search = useDebouncedValue(searchTerm);
  const filters = {page, limit, search: search, role: roleFilter === 'all' ? undefined : roleFilter, isActive: activeFilter === 'all' ? undefined : String(activeFilter === 'active'), sortBy, sortOrder};
  const listQuery = useAdminQuery(['users', filters], () => apiClient.getUsers(filters));
  const statsQuery = useAdminQuery(['analytics', 'users'], () => apiClient.getUserAnalytics("30d"));
  const users: AdminUserRow[] = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.pages ?? 1;
  const totalUsers = listQuery.data?.count ?? 0;
  const userStats = statsQuery.data;
  const newAccountCount = (userStats?.userGrowth || []).reduce((total, bucket) => total + bucket.count, 0);
  const loading = listQuery.isLoading;
  const fetchUsers = () => { void listQuery.refetch(); void statsQuery.refetch(); };


  const handleUserSubmit = async (userData: AdminUserPayload) => {
    try {
      if (editingUser) {
        await runMutation(() => apiClient.updateUser(editingUser.id, userData));
        toast({ title: "Success", description: "User updated successfully" });
      } else {
        await runMutation(() => apiClient.createUser(userData));
        toast({ title: "Success", description: "User created successfully" });
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to save user"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (await confirm({ title: "Delete user?", description: "Are you sure you want to delete this user?", confirmLabel: "Delete user" })) {
      try {
        await runMutation(() => apiClient.deleteUser(userId)); // Assuming ID is number for delete based on api-client
        toast({ title: "Success", description: "User deleted successfully" });
        fetchUsers();
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: ((error instanceof Error && error.message) || "Failed to delete user"),
          variant: "destructive",
        });
      }
    }
  };

  const handleViewUser = (user: AdminUserRow) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleEditUser = (user: AdminUserRow) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleViewAddresses = (user: AdminUserRow) => {
    setSelectedUser(user);
    setIsAddressesOpen(true);
  };

  const handleViewPaymentMethods = (user: AdminUserRow) => {
    setSelectedUser(user);
    setIsPaymentMethodsOpen(true);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  return (
    <PageShell className="fo-page">
      <SectionHeader eyebrow="People & access" title="Users & access" description="Manage customer accounts, permissions and account protection in one place." icon={<Users />} actions={<Button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}><Plus className="w-4 h-4" /> Add user</Button>} />
      <QueryError error={listQuery.error || statsQuery.error} retry={fetchUsers} />
      {userStats && (
        <div className="fo-stats" aria-label="User analytics">
          {[{label: "Total users", value: userStats.totalUsers, note: "Registered accounts", icon: Users}, {label: "Active accounts", value: userStats.activeUsers, note: "Accounts with active access", icon: Shield}, {label: "New users", value: userStats.newUsers, note: "Over the last 30 days", icon: UserPlus}, {label: "Growth", value: userStats.growth == null ? "Unavailable" : `${userStats.growth}%`, note: "Compared with previous period", icon: TrendingUp}].map(({label, value, note, icon: Icon}) => <div className="fo-stat" key={label}><div className="fo-stat-head"><p className="fo-stat-label">{label}</p><Icon className="fo-stat-icon" aria-hidden="true" /></div><p className={`fo-stat-value ${value === "Unavailable" ? "fo-value-unavailable" : ""}`}>{value}</p><p className="fo-stat-note">{note}</p></div>)}
        </div>
      )}
      <ActionBar className="fo-toolbar" layout="filters">
        <div className="fo-field"><label htmlFor="users-search">Find an account</label><div className="fo-search"><Search aria-hidden="true" /><Input id="users-search" placeholder="Search name, email or phone…" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} /></div></div>
        <div className="fo-field"><label htmlFor="users-role">Access level</label><Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(1); }}><SelectTrigger id="users-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="publisher">Publisher</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
        <div className="fo-field"><label htmlFor="users-status">Account status</label><Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setPage(1); }}><SelectTrigger id="users-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
      </ActionBar>
      {/* Users Table */}
      <Card className="fa-panel fa-results-panel">
        <div className="fa-panel-heading"><div><h2>Account directory</h2><p>Review identity, verification and access.</p></div><span className="fo-count">{totalUsers} accounts</span></div>
        {loading ? (
          <div className="fo-loading" role="status" aria-label="Loading users"><span className="fo-loading-label">Loading account directory…</span>{[0,1,2].map((row) => <div key={row} className="fo-loading-bar" />)}</div>
        ) : (
          <>
            <div className="fa-table-scroll" role="region" aria-label="User accounts" tabIndex={0}><table className="fa-data-table fo-table" aria-label="User accounts">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                    aria-sort={sortBy === "name" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button type="button" onClick={() => toggleSort("name")}>
                      User
                      {sortBy === "name" && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                    aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button type="button" onClick={() => toggleSort("email")}>
                      Email
                      {sortBy === "email" && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Email Verified
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    2FA
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Related Data
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-card transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="fo-person">
                        <img
                          src={
                            user.avatar || "/placeholder.svg?height=32&width=32"
                          }
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <span className="fo-person-name">
                            {user.name}
                          </span>
                          <p className="fo-person-secondary">{user.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-foreground">
                        {user.role === "admin" ? (
                          <>
                            <Shield className="w-4 h-4 text-[var(--fa-violet)]" />
                            Admin
                          </>
                        ) : user.role === "publisher" ? (
                          <>
                            <User className="w-4 h-4 text-primary" />
                            Publisher
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-muted-foreground" />
                            User
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.is_email_verified ? (
                        <span className="flex items-center gap-1 text-[var(--fa-success)]">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--fa-warning)]">
                          <Mail className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.two_factor_enabled ? (
                        <span className="flex items-center gap-1 text-[var(--fa-success)]">
                          <Lock className="w-4 h-4" />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`fa-status ${user.active ? "is-success" : "is-danger"}`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="fo-actions">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`View addresses for ${user.name}`}
                          onClick={() => handleViewAddresses(user)}
                          title="View Addresses"
                          className="size-11"
                        >
                          <MapPin className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`View payment methods for ${user.name}`}
                          onClick={() => handleViewPaymentMethods(user)}
                          title="View Payment Methods"
                          className="size-11"
                        >
                          <CreditCard className="w-4 h-4 text-[var(--fa-success)]" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="fo-actions">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`View account for ${user.name}`}
                          onClick={() => handleViewUser(user)}
                          className="size-11"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Edit account for ${user.name}`}
                          onClick={() => handleEditUser(user)}
                          className="size-11"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Delete account for ${user.name}`}
                          onClick={() => handleDeleteUser(user.id)}
                          className="size-11 fo-danger"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--fa-danger)]" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {users.length === 0 && <EmptyState className="m-5" icon={<Users />} title="No accounts match" description="Try another search or change the account filters." />}

            {totalUsers > 0 && <Pagination page={page} pages={totalPages} pending={listQuery.isFetching} onPage={setPage} total={totalUsers} pageSize={limit} noun="users" />}
          </>
        )}
      </Card>

      {/* Only render the series if the backend supplies it. */}
      {userStats && userStats.userGrowth.length > 0 && (
        <Card className="fa-panel fo-growth-panel">
          <div className="fa-panel-heading fo-growth-heading">
            <div><p className="fa-kicker">Community movement</p><h2>New account activity</h2><p>Daily registrations over the last 30 days · account count</p></div>
            <span className="fo-count">Last 30 days</span>
          </div>
          <p className="fo-growth-summary">{newAccountCount.toLocaleString()} new accounts across {userStats.userGrowth.length} recorded days. Days without registrations have no chart bucket.</p>
          <div className="fo-growth-chart" role="img" aria-label={`${newAccountCount.toLocaleString()} new accounts registered over the last 30 days, across ${userStats.userGrowth.length} recorded days. Exact daily counts are available in the chart data table.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userStats.userGrowth} margin={{ left: -20, right: 12, top: 12, bottom: 4 }} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} tickFormatter={insightsShortDate} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={10} />
                <Tooltip content={<InsightsTooltip />} cursor={{ stroke: "color-mix(in srgb, var(--primary) 32%, transparent)", strokeDasharray: "4 4" }} />
                <Line type="monotone" dataKey="count" name="New accounts" stroke={INSIGHTS_COLORS.cyan} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: INSIGHTS_COLORS.cyan, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="fo-growth-legend"><i aria-hidden="true" />New accounts · count</div>
          <InsightsDataTable title="Daily account registrations in the last 30 days" rows={userStats.userGrowth} columns={[{ key: "date", label: "Date (UTC)" }, { key: "count", label: "New accounts" }]} />
        </Card>
      )}

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleUserSubmit}
        initialData={editingUser}
      />
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
      />
      <UserAddressesModal
        isOpen={isAddressesOpen}
        onClose={() => setIsAddressesOpen(false)}
        user={selectedUser}
      />
      <UserPaymentMethodsModal
        isOpen={isPaymentMethodsOpen}
        onClose={() => setIsPaymentMethodsOpen(false)}
        user={selectedUser}
      />
      {confirmationDialog}
    </PageShell>
  );
}

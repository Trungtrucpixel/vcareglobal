import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Download, 
  FileText,
  Clock,
  Shield,
  Database,
  Calendar
} from "lucide-react";
import jsPDF from "jspdf";
import type { 
  User, 
  Transaction, 
  SystemConfig, 
  AuditLog,
  UserRoleUpdate,
  SystemConfigUpdate,
  ReportExport,
  Role,
  UserRole
} from "@shared/schema";

// Utility functions
const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return numAmount.toLocaleString("vi-VN") + " VND";
};

const formatDate = (date: string | Date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("vi-VN");
};

const formatDateTime = (date: string | Date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("vi-VN");
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "admin": return "default";
    case "accountant": return "secondary";
    case "branch": return "outline";
    case "staff": return "outline";
    default: return "secondary";
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed": case "approved": case "active": return "default";
    case "pending": return "secondary";
    case "rejected": case "inactive": return "destructive";
    default: return "secondary";
  }
};

// Multi-Role Management Component
const MultiRoleManagement = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showPadTokenForm, setShowPadTokenForm] = useState(false);
  const [padTokenAmount, setPadTokenAmount] = useState("");
  const [padTokenReason, setPadTokenReason] = useState("");
  const { toast } = useToast();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({ 
    queryKey: ['/api/admin/users'] 
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({ 
    queryKey: ['/api/admin/roles'] 
  });

  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery<UserRole[]>({ 
    queryKey: selectedUser ? [`/api/admin/users/${selectedUser.id}/roles`] : [],
    enabled: !!selectedUser
  });

  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string, roleIds: string[] }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/roles`, { roleIds });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Cập nhật vai trò thành công!" });
      setSelectedUser(null);
      setSelectedRoles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể cập nhật vai trò") });
    }
  });

  const updatePadTokenMutation = useMutation({
    mutationFn: async ({ userId, padToken, reason }: { userId: string, padToken: number, reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/pad-token`, { padToken, reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Cập nhật VCA Token thành công!" });
      setShowPadTokenForm(false);
      setPadTokenAmount("");
      setPadTokenReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể cập nhật VCA Token") });
    }
  });

  const handleRoleManagement = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(userRoles.map(ur => ur.roleId));
  };

  const handleSaveRoles = () => {
    if (!selectedUser) return;
    assignRolesMutation.mutate({ userId: selectedUser.id, roleIds: selectedRoles });
  };

  const handlePadTokenUpdate = (user: User) => {
    setSelectedUser(user);
    setShowPadTokenForm(true);
    setPadTokenAmount(user.padToken?.toString() || "0");
  };

  const handleSavePadToken = () => {
    if (!selectedUser || !padTokenAmount) return;
    updatePadTokenMutation.mutate({ 
      userId: selectedUser.id, 
      padToken: parseFloat(padTokenAmount), 
      reason: padTokenReason 
    });
  };

  const getUserRoles = (user: User) => {
    // This would typically come from the userRoles query
    // For now, we'll show the legacy single role
    return [user.role];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Quản lý người dùng và vai trò
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tên</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Vai trò hiện tại</TableHead>
                    <TableHead className="whitespace-nowrap">VCA Token</TableHead>
                    <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                    <TableHead className="whitespace-nowrap">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-user-name-${user.id}`}>
                        {user.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`badge-user-role-${user.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {getUserRoles(user).map((role, index) => (
                            <Badge key={index} variant={getRoleBadgeVariant(role)}>
                              {role === "admin" ? "Quản trị viên" :
                               role === "accountant" ? "Kế toán" :
                               role === "branch" ? "Chi nhánh" :
                               role === "staff" ? "Nhân viên" :
                               role === "customer" ? "Khách hàng" :
                               role === "shareholder" ? "Cổ đông đồng sáng lập" :
                               role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-user-pad-token-${user.id}`}>
                        {parseFloat(user.padToken || "0").toLocaleString()} VCA
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`badge-user-status-${user.id}`}>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status === "active" ? "Hoạt động" : "Ngừng hoạt động"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRoleManagement(user)}
                            data-testid={`button-edit-roles-${user.id}`}
                          >
                            Quản lý vai trò
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePadTokenUpdate(user)}
                            data-testid={`button-edit-pad-token-${user.id}`}
                          >
                            VCA Token
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Management Modal */}
      {selectedUser && !showPadTokenForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Quản lý vai trò cho {selectedUser.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vai trò hiện tại</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getUserRoles(selectedUser).map((role, index) => (
                    <Badge key={index} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Chọn vai trò mới</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                          }
                        }}
                        data-testid={`checkbox-role-${role.id}`}
                      />
                      <label htmlFor={`role-${role.id}`} className="text-sm">
                        {role.displayName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveRoles}
                  disabled={assignRolesMutation.isPending}
                  data-testid="button-save-roles"
                >
                  {assignRolesMutation.isPending ? "Đang lưu..." : "Lưu vai trò"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedUser(null)}
                  data-testid="button-cancel-roles"
                >
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VCA Token Management Modal */}
      {selectedUser && showPadTokenForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Cập nhật VCA Token cho {selectedUser.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="padTokenAmount">Số VCA Token</Label>
                <Input
                  id="padTokenAmount"
                  type="number"
                  value={padTokenAmount}
                  onChange={(e) => setPadTokenAmount(e.target.value)}
                  placeholder="Nhập số VCA Token"
                  data-testid="input-pad-token-amount"
                />
              </div>
              <div>
                <Label htmlFor="padTokenReason">Lý do cập nhật</Label>
                <Textarea
                  id="padTokenReason"
                  value={padTokenReason}
                  onChange={(e) => setPadTokenReason(e.target.value)}
                  placeholder="Nhập lý do cập nhật VCA Token..."
                  rows={3}
                  data-testid="textarea-pad-token-reason"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSavePadToken}
                  disabled={updatePadTokenMutation.isPending}
                  data-testid="button-save-pad-token"
                >
                  {updatePadTokenMutation.isPending ? "Đang lưu..." : "Lưu VCA Token"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPadTokenForm(false)}
                  data-testid="button-cancel-pad-token"
                >
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// User Management Component (Legacy - for backward compatibility)
const UserManagement = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({ 
    queryKey: ['/api/admin/users'] 
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Cập nhật quyền thành công!" });
      setSelectedUser(null);
      setNewRole("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể cập nhật quyền") });
    }
  });

  const handleRoleUpdate = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = () => {
    if (!selectedUser || !newRole) return;
    updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Quản lý người dùng
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Tên</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Quyền</TableHead>
                  <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                  <TableHead className="whitespace-nowrap">Mã giới thiệu</TableHead>
                  <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
                  <TableHead className="whitespace-nowrap">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="whitespace-nowrap" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-user-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`badge-user-role-${user.id}`}>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role === "admin" ? "Quản trị viên" :
                         user.role === "accountant" ? "Kế toán" :
                         user.role === "branch" ? "Chi nhánh" :
                         user.role === "staff" ? "Nhân viên" :
                         user.role === "customer" ? "Khách hàng" :
                         user.role === "shareholder" ? "Cổ đông đồng sáng lập" :
                         user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`badge-user-status-${user.id}`}>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status === "active" ? "Hoạt động" : "Ngừng hoạt động"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-user-refcode-${user.id}`}>
                      {user.refCode || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-user-created-${user.id}`}>
                      {user.createdAt ? formatDate(user.createdAt) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRoleUpdate(user)}
                        data-testid={`button-edit-role-${user.id}`}
                      >
                        Sửa quyền
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Role Update Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Cập nhật quyền người dùng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Người dùng</Label>
                  <p className="text-sm text-gray-600">{selectedUser.name} ({selectedUser.email})</p>
                </div>
                <div>
                  <Label htmlFor="role">Quyền mới</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger data-testid="select-new-role">
                      <SelectValue placeholder="Chọn quyền" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Quản trị viên</SelectItem>
                      <SelectItem value="accountant">Kế toán</SelectItem>
                      <SelectItem value="branch">Chi nhánh</SelectItem>
                      <SelectItem value="staff">Nhân viên</SelectItem>
                      <SelectItem value="customer">Khách hàng</SelectItem>
                      <SelectItem value="shareholder">Cổ đông đồng sáng lập</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveRole}
                    disabled={updateRoleMutation.isPending || !newRole}
                    data-testid="button-save-role"
                  >
                    {updateRoleMutation.isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUser(null)}
                    data-testid="button-cancel-role"
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Transaction Approval Component  
const TransactionApproval = () => {
  const { toast } = useToast();

  const { data: pendingTransactions = [], isLoading } = useQuery<Transaction[]>({ 
    queryKey: ['/api/admin/transactions/pending'] 
  });

  const approveMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest('POST', `/api/cash-flow/transactions/${transactionId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Duyệt giao dịch thành công!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions/pending'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể duyệt giao dịch") });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string, reason: string }) => {
      const response = await apiRequest('POST', `/api/cash-flow/transactions/${transactionId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Từ chối giao dịch thành công!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions/pending'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể từ chối giao dịch") });
    }
  });

  const handleApprove = (transactionId: string) => {
    approveMutation.mutate(transactionId);
  };

  const handleReject = (transactionId: string) => {
    const reason = prompt("Lý do từ chối (không bắt buộc):");
    rejectMutation.mutate({ transactionId, reason: reason || "Không có lý do cụ thể" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Duyệt giao dịch ({pendingTransactions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : pendingTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không có giao dịch chờ duyệt
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Ngày</TableHead>
                  <TableHead className="whitespace-nowrap">Loại</TableHead>
                  <TableHead className="whitespace-nowrap">Số tiền</TableHead>
                  <TableHead className="whitespace-nowrap">Thuế</TableHead>
                  <TableHead className="whitespace-nowrap">Mô tả</TableHead>
                  <TableHead className="whitespace-nowrap">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap" data-testid={`text-pending-date-${transaction.id}`}>
                      {transaction.date ? formatDate(transaction.date) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-pending-type-${transaction.id}`}>
                      <Badge variant="outline">
                        {transaction.type === "deposit" ? "Nạp tiền" : 
                         transaction.type === "invest" ? "Đầu tư" :
                         transaction.type === "withdraw" ? "Rút tiền" : 
                         transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-pending-amount-${transaction.id}`}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-pending-tax-${transaction.id}`}>
                      {transaction.taxAmount ? formatCurrency(transaction.taxAmount) : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`text-pending-description-${transaction.id}`}>
                      {transaction.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(transaction.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-approve-${transaction.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(transaction.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${transaction.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// System Configuration Component
const SystemConfiguration = () => {
  const [configForm, setConfigForm] = useState({
    configKey: "",
    configValue: "",
    description: "",
  });
  const { toast } = useToast();

  const { data: configs = [], isLoading } = useQuery<SystemConfig[]>({ 
    queryKey: ['/api/admin/configs'] 
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await apiRequest('POST', `/api/admin/configs/${configData.configKey}`, {
        configValue: configData.configValue,
        description: configData.description
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Cập nhật cấu hình thành công!" });
      setConfigForm({ configKey: "", configValue: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/configs'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể cập nhật cấu hình") });
    }
  });

  const handleUpdateConfig = (config: SystemConfig) => {
    setConfigForm({
      configKey: config.configKey,
      configValue: config.configValue,
      description: config.description || "",
    });
  };

  const handleSaveConfig = () => {
    if (!configForm.configKey || !configForm.configValue) {
      toast({ variant: "destructive", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }
    updateConfigMutation.mutate(configForm);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            Cấu hình hệ thống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="configKey">Tên cấu hình</Label>
              <Input
                value={configForm.configKey}
                onChange={(e) => setConfigForm(prev => ({ ...prev, configKey: e.target.value }))}
                placeholder="Nhập tên cấu hình (vd: maxout_limit_percentage)"
                data-testid="input-config-key"
              />
            </div>
            <div>
              <Label htmlFor="configValue">Giá trị</Label>
              <Input
                value={configForm.configValue}
                onChange={(e) => setConfigForm(prev => ({ ...prev, configValue: e.target.value }))}
                placeholder="Nhập giá trị cấu hình"
                data-testid="input-config-value"
              />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                value={configForm.description}
                onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả cấu hình..."
                rows={2}
                data-testid="textarea-config-description"
              />
            </div>
            <Button 
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              data-testid="button-save-config"
            >
              {updateConfigMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cấu hình hiện tại</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tên cấu hình</TableHead>
                    <TableHead className="whitespace-nowrap">Giá trị</TableHead>
                    <TableHead className="whitespace-nowrap">Mô tả</TableHead>
                    <TableHead className="whitespace-nowrap">Cập nhật lần cuối</TableHead>
                    <TableHead className="whitespace-nowrap">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="whitespace-nowrap font-mono text-sm" data-testid={`text-config-key-${config.configKey}`}>
                        {config.configKey}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-config-value-${config.configKey}`}>
                        {config.configValue}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-config-description-${config.configKey}`}>
                        {config.description || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-config-updated-${config.configKey}`}>
                        {config.updatedAt ? formatDateTime(config.updatedAt) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateConfig(config)}
                          data-testid={`button-edit-config-${config.configKey}`}
                        >
                          Sửa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Reports and Audit Component
const ReportsAndAudit = () => {
  const [reportForm, setReportForm] = useState({
    reportType: "",
    dateFrom: "",
    dateTo: "",
    format: "pdf" as "pdf" | "csv",
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({ 
    queryKey: ['/api/admin/audit-logs'] 
  });

  const exportMutation = useMutation({
    mutationFn: async (exportData: any) => {
      let endpoint = '/api/admin/reports/export';
      
      // Use specific endpoints for new report types
      if (exportData.reportType === 'pad_token_benefits') {
        endpoint = '/api/admin/reports/pad-token-benefits';
      } else if (exportData.reportType === 'roles_permissions') {
        endpoint = '/api/admin/reports/roles-permissions';
      }
      
      const response = await apiRequest('POST', endpoint, exportData);
      return response.json();
    },
    onSuccess: (data) => {
      if (reportForm.format === "pdf") {
        generatePDFReport(data, reportForm.reportType);
      } else {
        generateCSVReport(data, reportForm.reportType);
      }
      toast({ description: "Xuất báo cáo thành công!" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể xuất báo cáo") });
    }
  });

  const generatePDFReport = (data: any[], reportType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header styling
    doc.setFillColor(67, 176, 165); // #43B0A5
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('PHÚC AN ĐƯỜNG', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Báo cáo ${getReportTitle(reportType)}`, pageWidth / 2, 25, { align: 'center' });
    
    // Reset color for content
    doc.setTextColor(0, 0, 0);
    
    // Date info
    doc.setFontSize(10);
    doc.text(`Ngày tạo: ${formatDate(new Date().toISOString())}`, 20, 45);
    
    if (reportForm.dateFrom && reportForm.dateTo) {
      doc.text(`Từ ${reportForm.dateFrom} đến ${reportForm.dateTo}`, 20, 55);
    }
    
    // Summary section
    let yPos = 70;
    doc.setFontSize(12);
    doc.text(`Tổng số bản ghi: ${data.length}`, 20, yPos);
    yPos += 10;
    
    // Add separator line
    doc.setDrawColor(67, 176, 165);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 15;
    
    // Table data with better formatting
    doc.setFontSize(9);
    
    if (data.length === 0) {
      doc.text('Không có dữ liệu để hiển thị', 20, yPos);
    } else {
      const itemsPerPage = 20;
      let currentPage = 1;
      
      data.slice(0, 100).forEach((item, index) => { // Limit to 100 items
        if (yPos > pageHeight - 30) { // New page if needed
          // Page footer
          doc.setFontSize(8);
          doc.text(`Trang ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          
          doc.addPage();
          currentPage++;
          yPos = 20;
          
          // Repeat header on new page
          doc.setFontSize(12);
          doc.text(`Báo cáo ${getReportTitle(reportType)} (tiếp theo)`, 20, yPos);
          yPos += 15;
        }
        
        // Format different report types differently
        let line = '';
        if (reportType === 'users') {
          line = `${index + 1}. ${item.name || 'N/A'} - ${item.email || 'N/A'} - ${item.role || 'N/A'}`;
        } else if (reportType === 'transactions') {
          line = `${index + 1}. ${formatDate(item.date || new Date())} - ${item.type || 'N/A'} - ${formatCurrency(item.amount || 0)}`;
        } else if (reportType === 'audit') {
          line = `${index + 1}. ${formatDateTime(item.timestamp || new Date())} - ${item.action || 'N/A'} - ${item.userId || 'N/A'}`;
        } else if (reportType === 'pad_token_benefits') {
          line = `${index + 1}. ${item.name || 'N/A'} - VCA: ${item.padToken || 0} - Vai trò: ${item.role || 'N/A'} - Lợi ích: ${item.benefits?.padTokenValue || 0} VND`;
        } else if (reportType === 'roles_permissions') {
          line = `${index + 1}. ${item.displayName || 'N/A'} - Số người dùng: ${item.userCount || 0} - Quyền: ${(item.permissions || []).join(', ')}`;
        } else {
          // Generic formatting
          const displayText = typeof item === 'object' 
            ? Object.values(item).slice(0, 3).join(' - ')
            : String(item);
          line = `${index + 1}. ${displayText.substring(0, 80)}${displayText.length > 80 ? '...' : ''}`;
        }
        
        doc.text(line, 20, yPos);
        yPos += 7;
      });
      
      // Final page footer
      doc.setFontSize(8);
      doc.text(`Trang ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Footer with generation info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Được tạo bởi hệ thống Phúc An Đường vào ${new Date().toLocaleString('vi-VN')}`, 20, pageHeight - 5);
    
    // Save with descriptive filename
    const fileName = `phuc-an-duong-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const generateCSVReport = (data: any[], reportType: string) => {
    if (data.length === 0) {
      toast({ variant: "destructive", description: "Không có dữ liệu để xuất" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `phuc-an-duong-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReportTitle = (type: string) => {
    switch (type) {
      case "finance": return "Tài chính";
      case "tax": return "Thuế";
      case "transactions": return "Giao dịch";
      case "users": return "Người dùng";
      case "pad_token_benefits": return "VCA Token & Quyền lợi";
      case "roles_permissions": return "Vai trò & Quyền hạn";
      default: return type;
    }
  };

  const handleExport = () => {
    if (!reportForm.reportType) {
      toast({ variant: "destructive", description: "Vui lòng chọn loại báo cáo" });
      return;
    }
    exportMutation.mutate(reportForm);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-500" />
            Xuất báo cáo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportType">Loại báo cáo</Label>
              <Select value={reportForm.reportType} onValueChange={(value) => setReportForm(prev => ({ ...prev, reportType: value }))}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Chọn loại báo cáo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finance">Báo cáo tài chính</SelectItem>
                  <SelectItem value="tax">Báo cáo thuế</SelectItem>
                  <SelectItem value="transactions">Báo cáo giao dịch</SelectItem>
                  <SelectItem value="users">Báo cáo người dùng</SelectItem>
                  <SelectItem value="pad_token_benefits">Báo cáo VCA Token & Quyền lợi</SelectItem>
                  <SelectItem value="roles_permissions">Báo cáo Vai trò & Quyền hạn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="format">Định dạng</Label>
              <Select value={reportForm.format} onValueChange={(value: "pdf" | "csv") => setReportForm(prev => ({ ...prev, format: value }))}>
                <SelectTrigger data-testid="select-report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom">Từ ngày</Label>
              <Input
                type="date"
                value={reportForm.dateFrom}
                onChange={(e) => setReportForm(prev => ({ ...prev, dateFrom: e.target.value }))}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Đến ngày</Label>
              <Input
                type="date"
                value={reportForm.dateTo}
                onChange={(e) => setReportForm(prev => ({ ...prev, dateTo: e.target.value }))}
                data-testid="input-date-to"
              />
            </div>
          </div>
          <Button 
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="mt-4"
            data-testid="button-export-report"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? "Đang xuất..." : "Xuất báo cáo"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            Nhật ký hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Thời gian</TableHead>
                    <TableHead className="whitespace-nowrap">Hành động</TableHead>
                    <TableHead className="whitespace-nowrap">Loại đối tượng</TableHead>
                    <TableHead className="whitespace-nowrap">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-audit-time-${log.id}`}>
                        {log.createdAt ? formatDateTime(log.createdAt) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-audit-action-${log.id}`}>
                        <Badge variant="outline">
                          {log.action === "user_role_change" ? "Thay đổi quyền" :
                           log.action === "config_update" ? "Cập nhật cấu hình" :
                           log.action === "report_export" ? "Xuất báo cáo" :
                           log.action === "transaction_approval" ? "Duyệt giao dịch" :
                           log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-audit-entity-${log.id}`}>
                        {log.entityType}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-audit-details-${log.id}`}>
                        {log.newValue ? JSON.parse(log.newValue).role || 
                                        JSON.parse(log.newValue).configValue || 
                                        JSON.parse(log.newValue).reportType || 
                                        JSON.stringify(JSON.parse(log.newValue)).substring(0, 50) + "..." 
                                      : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main Admin Tab Component
export default function AdminTab() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quản trị hệ thống
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Quản lý người dùng, duyệt giao dịch, cấu hình hệ thống và xuất báo cáo
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            <Shield className="h-4 w-4 mr-2" />
            Duyệt giao dịch
          </TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">
            <Settings className="h-4 w-4 mr-2" />
            Cấu hình
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <FileText className="h-4 w-4 mr-2" />
            Báo cáo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <MultiRoleManagement />
        </TabsContent>

        <TabsContent value="approvals">
          <TransactionApproval />
        </TabsContent>

        <TabsContent value="config">
          <SystemConfiguration />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsAndAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
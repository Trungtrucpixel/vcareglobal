import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BsPersonPlus as PersonPlus, BsPencil as Pencil, BsEye as Eye } from "react-icons/bs";
import type { Staff, InsertStaff, Branch } from "@shared/schema";

export default function StaffTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<InsertStaff>({
    name: "",
    email: "",
    position: "",
    branchId: "",
    equityPercentage: "0",
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createStaffMutation = useMutation({
    mutationFn: async (staffData: InsertStaff) => {
      const res = await apiRequest("POST", "/api/staff", staffData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Thành công",
        description: "Nhân viên đã được thêm thành công",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertStaff> }) => {
      const res = await apiRequest("PUT", `/api/staff/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Thành công",
        description: "Nhân viên đã được cập nhật thành công",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      position: "",
      branchId: "",
      equityPercentage: "0",
    });
    setEditingStaff(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createStaffMutation.mutate(formData);
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      position: staffMember.position,
      branchId: staffMember.branchId || "",
      equityPercentage: staffMember.equityPercentage || "0",
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "Chưa phân công";
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : "Không xác định";
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (staffLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div>
      <Card>
        <CardHeader className="d-flex flex-row align-items-center justify-content-between">
          <h5 className="mb-0">Quản lý nhân viên</h5>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} data-testid="button-add-staff">
                <PersonPlus className="me-2" />
                Thêm nhân viên
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} data-testid="staff-form">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                      data-testid="input-staff-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="nva@phuanduong.com"
                      required
                      data-testid="input-staff-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="position">Vị trí</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Quản lý"
                      required
                      data-testid="input-staff-position"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="branchId">Chi nhánh</Label>
                    <Select 
                      value={formData.branchId || ""} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                    >
                      <SelectTrigger data-testid="select-staff-branch">
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="equityPercentage">Equity %</Label>
                    <Input
                      id="equityPercentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.equityPercentage || "0"}
                      onChange={(e) => setFormData(prev => ({ ...prev, equityPercentage: e.target.value }))}
                      placeholder="2.5"
                      data-testid="input-staff-equity"
                    />
                  </div>
                  
                  <div className="d-flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                      data-testid="button-submit-staff"
                    >
                      {editingStaff ? "Cập nhật" : "Thêm nhân viên"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-staff"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <div className="table-responsive">
            <table className="table table-hover" data-testid="staff-table">
              <thead className="table-light">
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Vị trí</th>
                  <th>Chi nhánh</th>
                  <th>Equity %</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((staffMember) => (
                  <tr key={staffMember.id} data-testid={`staff-row-${staffMember.id}`}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{ 
                            width: "40px", 
                            height: "40px",
                            backgroundColor: staffMember.id.includes('1') ? "#43B0A5" : "#28a745"
                          }}
                        >
                          <span className="text-white fw-bold">
                            {getInitials(staffMember.name)}
                          </span>
                        </div>
                        <div data-testid={`staff-name-${staffMember.id}`}>
                          {staffMember.name}
                        </div>
                      </div>
                    </td>
                    <td data-testid={`staff-email-${staffMember.id}`}>{staffMember.email}</td>
                    <td data-testid={`staff-position-${staffMember.id}`}>{staffMember.position}</td>
                    <td data-testid={`staff-branch-${staffMember.id}`}>
                      {getBranchName(staffMember.branchId)}
                    </td>
                    <td data-testid={`staff-equity-${staffMember.id}`}>
                      {staffMember.equityPercentage}%
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        className="me-1"
                        onClick={() => handleEdit(staffMember)}
                        data-testid={`button-edit-staff-${staffMember.id}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-staff-${staffMember.id}`}
                      >
                        <Eye />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {staff.length === 0 && (
              <div className="text-center py-4 text-muted" data-testid="empty-staff">
                Chưa có nhân viên nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

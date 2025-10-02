import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Staff, StaffKpi, Referral } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, Award, TrendingUp, DollarSign, Share2, Calculator, Gift, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

// KPI Performance Component
const KpiPerformance = () => {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedPeriod] = useState("quarter"); // Fixed to quarterly only
  const [selectedPeriodValue, setSelectedPeriodValue] = useState("2024-Q4");
  const [periodValueError, setPeriodValueError] = useState("");
  
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ['/api/staff'] });
  const { data: staffKpis = [] } = useQuery<StaffKpi[]>({ queryKey: ['/api/staff-kpis'] });
  
  const calculateKpiMutation = useMutation({
    mutationFn: async ({ staffId, period, periodValue }: { staffId: string; period: string; periodValue: string }) => {
      const response = await apiRequest('GET', `/api/staff-kpis/calculate/${staffId}/${period}/${periodValue}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-kpis'] });
    }
  });

  const processQuarterlySharesMutation = useMutation({
    mutationFn: async ({ period, periodValue }: { period: string; periodValue: string }) => {
      const response = await apiRequest('POST', '/api/staff-kpis/process-quarterly-shares', { period, periodValue });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
    }
  });

  const handleCalculateKpi = () => {
    if (!selectedStaff) return;
    calculateKpiMutation.mutate({ 
      staffId: selectedStaff, 
      period: selectedPeriod, 
      periodValue: selectedPeriodValue 
    });
  };

  const handleProcessQuarterlyShares = () => {
    processQuarterlySharesMutation.mutate({ 
      period: selectedPeriod, 
      periodValue: selectedPeriodValue 
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Calculation Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tính toán KPI nhân viên
          </CardTitle>
          <CardDescription>
            Tính toán điểm KPI và cổ phần theo quý
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="staff-select">Chọn nhân viên</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger data-testid="select-staff-kpi">
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s: Staff) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {s.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period-select">Kỳ đánh giá</Label>
              <div className="relative">
                <Input
                  value="Quý"
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  data-testid="input-period-fixed"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-xs text-gray-500">Chỉ hỗ trợ quý</span>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="period-value">Giá trị kỳ</Label>
              <Input
                value={selectedPeriodValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedPeriodValue(value);
                  // Validate quarterly format
                  const quarterPattern = /^\d{4}-Q[1-4]$/;
                  if (value && !quarterPattern.test(value)) {
                    setPeriodValueError("Định dạng phải là YYYY-Q[1-4] (ví dụ: 2024-Q4)");
                  } else {
                    setPeriodValueError("");
                  }
                }}
                placeholder="VD: 2024-Q4"
                className={periodValueError ? "border-red-500" : ""}
                data-testid="input-period-value"
              />
              {periodValueError && (
                <p className="text-red-500 text-xs mt-1" data-testid="text-period-error">
                  {periodValueError}
                </p>
              )}
              {!periodValueError && !selectedPeriodValue && (
                <p className="text-gray-500 text-xs mt-1">
                  Định dạng: YYYY-Q[1-4] (2024-Q1, 2024-Q2, 2024-Q3, 2024-Q4)
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCalculateKpi}
              disabled={!selectedStaff || calculateKpiMutation.isPending || !!periodValueError || !selectedPeriodValue}
              data-testid="button-calculate-kpi"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Tính KPI
            </Button>
            <Button 
              onClick={handleProcessQuarterlyShares}
              disabled={processQuarterlySharesMutation.isPending || !!periodValueError || !selectedPeriodValue}
              variant="outline"
              data-testid="button-process-shares"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Xử lý cổ phần quý
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Results Display */}
      {calculateKpiMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả tính KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="text-total-points">
                  {calculateKpiMutation.data.totalPoints}
                </div>
                <div className="text-sm text-gray-600">Tổng điểm</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-slots-earned">
                  {calculateKpiMutation.data.slotsEarned}
                </div>
                <div className="text-sm text-gray-600">Slot kiếm được</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" data-testid="text-shares-earned">
                  {calculateKpiMutation.data.sharesEarned}
                </div>
                <div className="text-sm text-gray-600">Cổ phần</div>
              </div>
              <div className="text-center">
                <Badge 
                  variant={calculateKpiMutation.data.isEligible ? "default" : "secondary"}
                  data-testid="badge-eligibility"
                >
                  {calculateKpiMutation.data.isEligible ? "Đủ điều kiện" : "Chưa đủ điều kiện"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff KPI Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bảng KPI nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nhân viên</TableHead>
                  <TableHead className="whitespace-nowrap">Kỳ</TableHead>
                  <TableHead className="whitespace-nowrap">Điểm số</TableHead>
                  <TableHead className="whitespace-nowrap">Chỉ tiêu</TableHead>
                  <TableHead className="whitespace-nowrap">Thưởng</TableHead>
                  <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffKpis.map((kpi: StaffKpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="whitespace-nowrap" data-testid={`text-staff-name-${kpi.id}`}>
                      {staff.find((s: Staff) => s.id === kpi.staffId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-period-${kpi.id}`}>
                      {kpi.period} {kpi.periodValue}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-score-${kpi.id}`}>
                      {kpi.score || 0}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-target-${kpi.id}`}>
                      {formatCurrency(parseFloat(kpi.targetRevenue || "0"))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-bonus-${kpi.id}`}>
                      {formatCurrency(parseFloat(kpi.bonusAmount || "0"))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`badge-status-${kpi.id}`}>
                      <Badge variant={parseFloat(kpi.score || "0") >= 50 ? "default" : "secondary"}>
                        {parseFloat(kpi.score || "0") >= 50 ? "Đạt" : "Chưa đạt"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Referral Management Component
const ReferralManagement = () => {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isGenerateCodeOpen, setIsGenerateCodeOpen] = useState(false);
  
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ['/api/staff'] });
  const { data: referrals = [] } = useQuery<Referral[]>({ queryKey: ['/api/referrals'] });
  
  const generateCodeMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await apiRequest('POST', '/api/referrals/generate-code', { staffId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      setIsGenerateCodeOpen(false);
    }
  });

  const handleGenerateCode = () => {
    if (!selectedStaff) return;
    generateCodeMutation.mutate(selectedStaff);
  };

  return (
    <div className="space-y-6">
      {/* Generate Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Tạo mã giới thiệu
          </CardTitle>
          <CardDescription>
            Tạo mã giới thiệu cho nhân viên - hoa hồng 8% từ giao dịch đầu tiên
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isGenerateCodeOpen} onOpenChange={setIsGenerateCodeOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-open-generate-code">
                <Gift className="h-4 w-4 mr-2" />
                Tạo mã giới thiệu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mã giới thiệu mới</DialogTitle>
                <DialogDescription>
                  Chọn nhân viên để tạo mã giới thiệu
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="staff-referral-select">Chọn nhân viên</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger data-testid="select-staff-referral">
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s: Staff) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - {s.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateCode}
                  disabled={!selectedStaff || generateCodeMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-code"
                >
                  Tạo mã
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {generateCodeMutation.data && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800">Mã giới thiệu đã được tạo!</h4>
              <p className="text-green-700">
                Mã: <code className="bg-white px-2 py-1 rounded" data-testid="text-generated-code">
                  {generateCodeMutation.data.referralCode}
                </code>
              </p>
              <p className="text-green-700">
                URL: <code className="bg-white px-2 py-1 rounded text-xs" data-testid="text-generated-url">
                  {generateCodeMutation.data.referralUrl}
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng giới thiệu</p>
                <p className="text-2xl font-bold" data-testid="text-total-referrals">
                  {referrals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Hoa hồng kiếm được</p>
                <p className="text-2xl font-bold" data-testid="text-total-commission">
                  {formatCurrency(
                    referrals.reduce((sum: number, r: Referral) => sum + parseFloat(r.commissionAmount || "0"), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Hoa hồng đã trả</p>
                <p className="text-2xl font-bold" data-testid="text-paid-commission">
                  {formatCurrency(
                    referrals.reduce((sum: number, r: Referral) => sum + parseFloat(r.commissionPaid || "0"), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Danh sách giới thiệu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Mã giới thiệu</TableHead>
                  <TableHead className="whitespace-nowrap">Người giới thiệu</TableHead>
                  <TableHead className="whitespace-nowrap">Khách hàng</TableHead>
                  <TableHead className="whitespace-nowrap">Giá trị đóng góp</TableHead>
                  <TableHead className="whitespace-nowrap">Hoa hồng</TableHead>
                  <TableHead className="whitespace-nowrap">Đã trả</TableHead>
                  <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral: Referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="whitespace-nowrap" data-testid={`text-code-${referral.id}`}>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {referral.referralCode}
                      </code>
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-referrer-${referral.id}`}>
                      {staff.find((s: Staff) => s.id === referral.referrerId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-customer-${referral.id}`}>
                      {referral.customerName || 'N/A'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-contribution-${referral.id}`}>
                      {formatCurrency(parseFloat(referral.contributionValue || "0"))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-commission-amount-${referral.id}`}>
                      {formatCurrency(parseFloat(referral.commissionAmount || "0"))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`text-commission-paid-${referral.id}`}>
                      {formatCurrency(parseFloat(referral.commissionPaid || "0"))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap" data-testid={`badge-referral-status-${referral.id}`}>
                      <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                        {referral.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Share Management Component
const ShareManagement = () => {
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ['/api/staff'] });
  
  const totalShares = staff.reduce((sum: number, s: Staff) => sum + (s.shares || 0), 0);
  const totalEquityValue = totalShares * 1000000; // 1M VND per share
  
  return (
    <div className="space-y-6">
      {/* Equity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng cổ phần</p>
                <p className="text-2xl font-bold" data-testid="text-total-shares">
                  {totalShares.toLocaleString()} cổ phần
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Giá trị vốn chủ sở hữu</p>
                <p className="text-2xl font-bold" data-testid="text-equity-value">
                  {formatCurrency(totalEquityValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Chủ sở hữu</p>
                <p className="text-2xl font-bold" data-testid="text-shareholders">
                  {staff.filter((s: Staff) => (s.shares || 0) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Distribution Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Quy tắc cổ phần:</strong> ≥50 điểm/quý = 1 slot (50 cổ phần). 
          Giá trị: 1M VND/cổ phần. Chia lợi nhuận tự động từ 49% lợi nhuận cuối quý.
        </AlertDescription>
      </Alert>

      {/* Staff Equity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Phân bổ cổ phần nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nhân viên</TableHead>
                  <TableHead className="whitespace-nowrap">Vị trí</TableHead>
                  <TableHead className="whitespace-nowrap">Cổ phần</TableHead>
                  <TableHead className="whitespace-nowrap">Tỷ lệ (%)</TableHead>
                  <TableHead className="whitespace-nowrap">Giá trị vốn</TableHead>
                  <TableHead className="whitespace-nowrap">Ngày cập nhật</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {staff
                .filter((s: Staff) => (s.shares || 0) > 0)
                .sort((a: Staff, b: Staff) => (b.shares || 0) - (a.shares || 0))
                .map((member: Staff) => {
                  const shares = member.shares || 0;
                  const percentage = totalShares > 0 ? (shares / totalShares * 100) : 0;
                  const equityValue = shares * 1000000;
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-name-${member.id}`}>
                        {member.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-position-${member.id}`}>
                        {member.position}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-shares-${member.id}`}>
                        {shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-percentage-${member.id}`}>
                        {percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-equity-${member.id}`}>
                        {formatCurrency(equityValue)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-member-updated-${member.id}`}>
                        {member.updatedAt ? formatDate(typeof member.updatedAt === 'string' ? member.updatedAt : member.updatedAt.toISOString()) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Staff & Equity Tab Component
export default function StaffEquityTab() {
  const { toast } = useToast();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nhân viên & Cổ phần
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Quản lý KPI nhân viên, giới thiệu và hệ thống cổ phần
        </p>
      </div>

      <Tabs defaultValue="kpi" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kpi" data-testid="tab-kpi">
            <TrendingUp className="h-4 w-4 mr-2" />
            KPI & Hiệu suất
          </TabsTrigger>
          <TabsTrigger value="referrals" data-testid="tab-referrals">
            <Gift className="h-4 w-4 mr-2" />
            Giới thiệu
          </TabsTrigger>
          <TabsTrigger value="shares" data-testid="tab-shares">
            <Share2 className="h-4 w-4 mr-2" />
            Cổ phần
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpi">
          <KpiPerformance />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralManagement />
        </TabsContent>

        <TabsContent value="shares">
          <ShareManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
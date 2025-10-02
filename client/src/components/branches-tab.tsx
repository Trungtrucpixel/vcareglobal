import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BsBuilding as Building, BsGraphUp as GraphUp, BsExclamationTriangle as ExclamationTriangle, BsTrophy as Trophy, BsClipboardData as ClipboardData } from "react-icons/bs";
import type { Branch } from "@shared/schema";

interface BranchPerformance extends Branch {
  kpiScore: number;
  cardSales: number;
  revisitRate: number;
  deviceRevenue: number;
  totalRevenue: number;
  isUnderperforming: boolean;
  padTokenValue: number; // Parsed value for display
  revenuePredictions: {
    sixMonths: number;
    oneYear: number;
    threeYears: number;
    fiveYears: number;
  };
}

interface KpiAlert {
  type: string;
  severity: string;
  message: string;
  branchId: string;
  branchName: string;
  kpiScore: number;
}

export default function BranchesTab() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedPeriodValue, setSelectedPeriodValue] = useState("2024-11");

  // Queries
  const { data: branchPerformance = [], isLoading } = useQuery<BranchPerformance[]>({
    queryKey: ["/api/branches/performance", selectedPeriod, selectedPeriodValue],
    queryFn: async () => {
      const response = await fetch(`/api/branches/performance?period=${selectedPeriod}&periodValue=${selectedPeriodValue}`);
      return response.json();
    },
  });

  const { data: kpiAlerts = [] } = useQuery<KpiAlert[]>({
    queryKey: ["/api/kpis/alerts", selectedPeriod, selectedPeriodValue],
    queryFn: async () => {
      const response = await fetch(`/api/kpis/alerts?period=${selectedPeriod}&periodValue=${selectedPeriodValue}`);
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M₫`;
  };

  const getKpiVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary"; 
    if (score >= 70) return "outline";
    return "destructive";
  };

  const getPeriodOptions = () => {
    if (selectedPeriod === "month") {
      return [
        { value: "2024-11", label: "Tháng 11/2024" },
        { value: "2024-10", label: "Tháng 10/2024" },
        { value: "2024-09", label: "Tháng 9/2024" },
      ];
    } else if (selectedPeriod === "quarter") {
      return [
        { value: "2024-Q4", label: "Quý 4/2024" },
        { value: "2024-Q3", label: "Quý 3/2024" },
        { value: "2024-Q2", label: "Quý 2/2024" },
      ];
    } else {
      return [
        { value: "2024", label: "Năm 2024" },
        { value: "2023", label: "Năm 2023" },
      ];
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Đang tải dữ liệu KPI...</div>;
  }

  return (
    <div className="container-fluid px-3">
      {/* KPI Alerts */}
      {kpiAlerts.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            {kpiAlerts.map((alert, index) => (
              <Alert key={index} className={`mb-2 alert-${alert.type}`} data-testid={`kpi-alert-${alert.branchId}`}>
                <ExclamationTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{alert.severity === "critical" ? "Khẩn cấp" : alert.severity === "high" ? "Cao" : "Trung bình"}:</strong> {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Period Selection */}
      <div className="row mb-4">
        <div className="col-12 col-md-6 mb-3">
          <Card>
            <CardHeader className="pb-2">
              <h6 className="mb-0 d-flex align-items-center">
                <ClipboardData className="me-2" />
                Chọn kỳ báo cáo
              </h6>
            </CardHeader>
            <CardContent>
              <div className="row g-2">
                <div className="col-6">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="form-control-lg" data-testid="select-period-type">
                      <SelectValue placeholder="Chọn kỳ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Tháng</SelectItem>
                      <SelectItem value="quarter">Quý</SelectItem>
                      <SelectItem value="year">Năm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-6">
                  <Select value={selectedPeriodValue} onValueChange={setSelectedPeriodValue}>
                    <SelectTrigger className="form-control-lg" data-testid="select-period-value">
                      <SelectValue placeholder="Chọn thời gian" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPeriodOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-12 col-md-6 mb-3">
          <Card>
            <CardHeader className="pb-2">
              <h6 className="mb-0 d-flex align-items-center">
                <Trophy className="me-2" />
                Tổng quan KPI
              </h6>
            </CardHeader>
            <CardContent>
              <div className="row text-center">
                <div className="col-4">
                  <div className="fw-bold text-primary">{branchPerformance.length}</div>
                  <small className="text-muted">Chi nhánh</small>
                </div>
                <div className="col-4">
                  <div className="fw-bold text-success">
                    {branchPerformance.filter(b => b.kpiScore >= 70).length}
                  </div>
                  <small className="text-muted">Đạt KPI</small>
                </div>
                <div className="col-4">
                  <div className="fw-bold text-danger">
                    {branchPerformance.filter(b => b.kpiScore < 70).length}
                  </div>
                  <small className="text-muted">Dưới 70%</small>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Franchise Benefits Section */}
      <div className="row mb-4">
        <div className="col-12">
          <Card className="border-primary">
            <CardHeader className="bg-primary text-white">
              <h5 className="mb-0 d-flex align-items-center">
                <Trophy className="me-2" />
                Quyền lợi Nhượng quyền sớm
              </h5>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="card bg-light h-100">
                    <div className="card-body text-center">
                      <h3 className="text-primary fw-bold">20,000 PAD</h3>
                      <p className="mb-1"><strong>200 phần cổ định</strong></p>
                      <small className="text-muted">Tương đương 200 triệu VNĐ vốn góp</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-8">
                  <h6 className="fw-bold mb-3">📋 Quyền lợi bao gồm:</h6>
                  <div className="row">
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>SOP vận hành chi nhánh chi tiết</span>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>Đào tạo toàn diện cho nhân viên</span>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>Phần mềm quản lý tích hợp</span>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>Hỗ trợ marketing & branding</span>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>Chia sẻ lợi nhuận 49% (với KPI ≥70%)</span>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-2">
                      <div className="d-flex align-items-start">
                        <span className="badge bg-success me-2 mt-1">✓</span>
                        <span>Tư vấn chiến lược định kỳ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Predictions */}
      {branchPerformance.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <CardHeader>
                <h5 className="mb-0 d-flex align-items-center">
                  <GraphUp className="me-2" />
                  Dự đoán doanh thu theo thời gian
                </h5>
              </CardHeader>
              <CardContent>
                <div className="row text-center">
                  <div className="col-6 col-md-3 mb-3">
                    <div className="card bg-light">
                      <div className="card-body">
                        <small className="text-muted d-block mb-1">6 tháng</small>
                        <h5 className="fw-bold text-primary mb-0">{formatCurrency(branchPerformance[0]?.revenuePredictions?.sixMonths || 80000000)}</h5>
                        <small className="text-muted">/tháng</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3 mb-3">
                    <div className="card bg-light">
                      <div className="card-body">
                        <small className="text-muted d-block mb-1">1 năm</small>
                        <h5 className="fw-bold text-success mb-0">{formatCurrency(branchPerformance[0]?.revenuePredictions?.oneYear || 120000000)}</h5>
                        <small className="text-muted">/tháng</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3 mb-3">
                    <div className="card bg-light">
                      <div className="card-body">
                        <small className="text-muted d-block mb-1">3 năm</small>
                        <h5 className="fw-bold text-info mb-0">{formatCurrency(branchPerformance[0]?.revenuePredictions?.threeYears || 200000000)}</h5>
                        <small className="text-muted">/tháng</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3 mb-3">
                    <div className="card bg-light">
                      <div className="card-body">
                        <small className="text-muted d-block mb-1">5 năm</small>
                        <h5 className="fw-bold text-warning mb-0">{formatCurrency(branchPerformance[0]?.revenuePredictions?.fiveYears || 350000000)}</h5>
                        <small className="text-muted">/tháng</small>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Branch Ranking Table */}
      <div className="row">
        <div className="col-12">
          <Card>
            <CardHeader>
              <h5 className="mb-0 d-flex align-items-center">
                <GraphUp className="me-2" />
                Bảng xếp hạng chi nhánh - {getPeriodOptions().find(p => p.value === selectedPeriodValue)?.label}
              </h5>
            </CardHeader>
            <CardContent>
              {/* Mobile-optimized table */}
              <div className="table-responsive">
                <table className="table table-striped table-hover" data-testid="branches-ranking-table">
                  <thead className="table-dark">
                    <tr>
                      <th className="text-center">#</th>
                      <th>Chi nhánh</th>
                      <th className="text-center">PAD Token</th>
                      <th className="text-center">KPI Score</th>
                      <th className="text-center d-none d-md-table-cell">Bán thẻ</th>
                      <th className="text-center d-none d-md-table-cell">Tái khám (%)</th>
                      <th className="text-center d-none d-lg-table-cell">DT Thiết bị</th>
                      <th className="text-center d-none d-lg-table-cell">Tổng DT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchPerformance.map((branch, index) => (
                      <tr key={branch.id} data-testid={`branch-row-${branch.id}`}>
                        <td className="text-center fw-bold">
                          {index === 0 && <Trophy className="text-warning me-1" />}
                          {index + 1}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Building className="me-2 text-primary" />
                            <div>
                              <div className="fw-bold">{branch.name.replace("Chi nhánh ", "")}</div>
                              <small className="text-muted d-md-none">
                                {branch.cardSales} thẻ • {branch.revisitRate.toFixed(1)}% tái khám
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="text-center" data-testid={`pad-token-${branch.id}`}>
                          <span className="fw-bold text-success">{(branch.padTokenValue || 20000).toLocaleString('vi-VN')}</span>
                          <small className="text-muted d-block">PAD</small>
                        </td>
                        <td className="text-center">
                          <Badge variant={getKpiVariant(branch.kpiScore)} data-testid={`kpi-score-${branch.id}`}>
                            {branch.kpiScore}%
                          </Badge>
                          {branch.isUnderperforming && (
                            <div>
                              <Badge variant="destructive" className="mt-1">
                                <ExclamationTriangle className="me-1" style={{ fontSize: "12px" }} />
                                Cảnh báo
                              </Badge>
                            </div>
                          )}
                        </td>
                        <td className="text-center d-none d-md-table-cell" data-testid={`card-sales-${branch.id}`}>
                          <span className="fw-bold">{branch.cardSales}</span>
                          <small className="text-muted d-block">thẻ</small>
                        </td>
                        <td className="text-center d-none d-md-table-cell" data-testid={`revisit-rate-${branch.id}`}>
                          <span className={`fw-bold ${branch.revisitRate >= 80 ? "text-success" : branch.revisitRate >= 70 ? "text-warning" : "text-danger"}`}>
                            {branch.revisitRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center d-none d-lg-table-cell" data-testid={`device-revenue-${branch.id}`}>
                          <span className="fw-bold">{formatCurrency(branch.deviceRevenue)}</span>
                        </td>
                        <td className="text-center d-none d-lg-table-cell" data-testid={`total-revenue-${branch.id}`}>
                          <span className="fw-bold text-primary">{formatCurrency(branch.totalRevenue)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {branchPerformance.length === 0 && (
                <div className="text-center py-4 text-muted" data-testid="empty-performance">
                  Không có dữ liệu KPI cho kỳ báo cáo này
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Details Cards for Mobile */}
      <div className="row mt-4 d-md-none">
        {branchPerformance.map((branch) => (
          <div key={`mobile-${branch.id}`} className="col-12 mb-3">
            <Card className={branch.isUnderperforming ? "border-danger" : ""}>
              <CardContent className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-0">{branch.name.replace("Chi nhánh ", "")}</h6>
                  <Badge variant={getKpiVariant(branch.kpiScore)}>
                    {branch.kpiScore}% KPI
                  </Badge>
                </div>
                
                <div className="row text-center">
                  <div className="col-6 col-sm-3 mb-2">
                    <div className="fw-bold text-success">{(branch.padTokenValue || 20000).toLocaleString('vi-VN')}</div>
                    <small className="text-muted">PAD Token</small>
                  </div>
                  <div className="col-6 col-sm-3 mb-2">
                    <div className="fw-bold text-primary">{branch.cardSales}</div>
                    <small className="text-muted">Bán thẻ</small>
                  </div>
                  <div className="col-6 col-sm-3 mb-2">
                    <div className={`fw-bold ${branch.revisitRate >= 80 ? "text-success" : branch.revisitRate >= 70 ? "text-warning" : "text-danger"}`}>
                      {branch.revisitRate.toFixed(1)}%
                    </div>
                    <small className="text-muted">Tái khám</small>
                  </div>
                  <div className="col-6 col-sm-3 mb-2">
                    <div className="fw-bold">{formatCurrency(branch.deviceRevenue)}</div>
                    <small className="text-muted">DT Thiết bị</small>
                  </div>
                  <div className="col-12 col-sm-12 mb-2">
                    <div className="fw-bold text-primary">{formatCurrency(branch.totalRevenue)}</div>
                    <small className="text-muted">Tổng DT</small>
                  </div>
                </div>

                {branch.isUnderperforming && (
                  <div className="mt-2">
                    <Alert className="py-2 mb-0 alert-danger">
                      <AlertDescription className="mb-0">
                        <small>
                          <ExclamationTriangle className="me-1" />
                          Chi nhánh cần cải thiện KPI (dưới 70%)
                        </small>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Profit Sharing Eligibility Notice */}
      <div className="row mt-4">
        <div className="col-12">
          <Alert className="alert-info">
            <AlertDescription>
              <strong>Lưu ý:</strong> Chỉ chi nhánh có KPI ≥ 70% mới được tham gia chia sẻ lợi nhuận. 
              Hiện tại có <strong>{branchPerformance.filter(b => b.kpiScore >= 70).length}/{branchPerformance.length}</strong> chi nhánh đủ điều kiện.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useRef } from "react";
import { getQueryFn } from "@/lib/queryClient";

declare global {
  interface Window {
    Chart: any;
  }
}

interface BusinessOverview {
  quarterlyData: {
    labels: string[];
    revenue: number[];
    expenses: number[];
    profitAfterTax: number[];
  };
  cardMaxoutStatus: Array<{
    type: string;
    current: number;
    max: number;
    percentage: number;
  }>;
  profitAllocation: {
    roles: number;
    operations: number;
    expansion: number;
    capitalBased: number;
    laborBased: number;
  };
  profitAllocationBreakdown: {
    capital: {
      percentage: number;
      roles: string[];
    };
    labor: {
      percentage: number;
      roles: string[];
    };
  };
  roiPredictions: Array<{
    role: string;
    investment: number;
    sixMonths: number;
    oneYear: number;
    threeYears: number;
    fiveYears: number;
    fiveYearROI: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  topBranches: Array<{
    rank: number;
    name: string;
    score: number;
    kpi: number;
  }>;
}

export default function DashboardTab() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);
  const profitChartRef = useRef<HTMLCanvasElement>(null);
  const profitChartInstance = useRef<any>(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    totalRevenue: string;
    activeCards: number;
    branches: number;
    staff: number;
    padToken: number;
  } | null>({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false
  });

  const { data: businessData, isLoading: businessLoading } = useQuery<BusinessOverview>({
    queryKey: ["/api/dashboard/business-overview"],
  });

  useEffect(() => {
    if (businessData && chartRef.current && window.Chart) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: businessData.quarterlyData.labels,
          datasets: [
            {
              label: 'Doanh thu',
              data: businessData.quarterlyData.revenue,
              backgroundColor: '#43B0A5',
              borderRadius: 4,
            },
            {
              label: 'Chi phí', 
              data: businessData.quarterlyData.expenses,
              backgroundColor: '#ffc107',
              borderRadius: 4,
            },
            {
              label: 'Lợi nhuận sau thuế',
              data: businessData.quarterlyData.profitAfterTax,
              backgroundColor: '#28a745',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const,
            },
            title: {
              display: true,
              text: 'Báo cáo tài chính theo quý (USD)'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value: any) {
                  return '$' + value;
                }
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [businessData]);

  useEffect(() => {
    if (businessData && profitChartRef.current && window.Chart) {
      if (profitChartInstance.current) {
        profitChartInstance.current.destroy();
      }

      const ctx = profitChartRef.current.getContext('2d');
      profitChartInstance.current = new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Vốn (30%)', 'Công (19%)'],
          datasets: [{
            data: [
              businessData.profitAllocation.capitalBased,
              businessData.profitAllocation.laborBased
            ],
            backgroundColor: ['#43B0A5', '#ffc107'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
            },
            title: {
              display: true,
              text: 'Phân bổ 49% lợi nhuận sau thuế'
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  return context.label + ': ' + context.parsed + '%';
                }
              }
            }
          }
        }
      });
    }

    return () => {
      if (profitChartInstance.current) {
        profitChartInstance.current.destroy();
      }
    };
  }, [businessData]);

  useEffect(() => {
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  if (metricsLoading || businessLoading) {
    return (
      <div className="row">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="col-12 col-md-6 col-xl-4">
            <Card className="metric-card mb-3">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  const getProgressVariant = (percentage: number) => {
    if (percentage >= 85) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const padToken = metrics?.padToken ?? 0;
  const padValuePredictions = {
    sixMonths: padToken * 12000,
    oneYear: padToken * 15000,
    threeYears: padToken * 25000,
    fiveYears: padToken * 40000
  };

  const hasMetrics = metrics !== undefined;

  return (
    <div>
      {businessData?.alerts && businessData.alerts.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            {businessData.alerts.map((alert, index) => (
              <Alert 
                key={index} 
                className={`mb-2 alert-${alert.type}`} 
                data-testid={`alert-${index}`}
              >
                <AlertDescription>
                  <i className={`bi ${alert.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-circle-fill'} me-2`}></i>
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="metric-card">
            <div className="metric-value" data-testid="metric-revenue">{metrics?.totalRevenue || "0"}₫</div>
            <div className="metric-label">Doanh thu tháng</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="metric-card">
            <div className="metric-value" data-testid="metric-cards">{metrics?.activeCards || 0}</div>
            <div className="metric-label">Thẻ đang hoạt động</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="metric-card">
            <div className="metric-value" data-testid="metric-branches">{metrics?.branches || 0}</div>
            <div className="metric-label">Chi nhánh</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="metric-card">
            <div className="metric-value" data-testid="metric-staff">{metrics?.staff || 0}</div>
            <div className="metric-label">Nhân viên</div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <Card>
            <CardHeader>
              <h5 className="mb-0">
                <i className="bi bi-coin me-2" style={{ color: '#43B0A5' }}></i>
                PAD Token & Dự đoán giá trị
              </h5>
            </CardHeader>
            <CardContent>
              <div className="row">
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <div className="text-center p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="display-6 fw-bold" style={{ color: '#43B0A5' }} data-testid="pad-token-amount">
                      {padToken.toLocaleString('vi-VN')}
                    </div>
                    <div className="text-muted small">PAD Token hiện tại</div>
                    <div className="text-muted small mt-1">
                      (100 PAD = 1 triệu VNĐ)
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <div className="text-center p-3 rounded" style={{ backgroundColor: '#e8f5f3' }}>
                    <div className="h4 fw-bold" data-testid="pad-value-6months">
                      {padValuePredictions.sixMonths.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-muted small">Dự đoán 6 tháng</div>
                    <div className="badge bg-success mt-1">12.000₫/PAD</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <div className="text-center p-3 rounded" style={{ backgroundColor: '#e8f5f3' }}>
                    <div className="h4 fw-bold" data-testid="pad-value-1year">
                      {padValuePredictions.oneYear.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-muted small">Dự đoán 1 năm</div>
                    <div className="badge bg-info mt-1">15.000₫/PAD</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <div className="text-center p-3 rounded" style={{ backgroundColor: '#fff3cd' }}>
                    <div className="h4 fw-bold" data-testid="pad-value-3years">
                      {padValuePredictions.threeYears.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-muted small">Dự đoán 3 năm</div>
                    <div className="badge bg-warning mt-1">25.000₫/PAD</div>
                  </div>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-12">
                  <div className="text-center p-4 rounded" style={{ backgroundColor: '#fff0f0', border: '2px solid #dc3545' }}>
                    <div className="display-5 fw-bold text-danger" data-testid="pad-value-5years">
                      {padValuePredictions.fiveYears.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-muted">Dự đoán 5 năm</div>
                    <div className="badge bg-danger mt-2">40.000₫/PAD</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-xl-8 mb-4">
          <Card>
            <CardHeader>
              <h5 className="mb-0">Báo cáo tài chính theo quý</h5>
            </CardHeader>
            <CardContent>
              <div className="chart-container" style={{ position: "relative", height: "350px" }}>
                <canvas ref={chartRef} data-testid="financial-chart"></canvas>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-12 col-xl-4 mb-4">
          <Card>
            <CardHeader>
              <h5 className="mb-0">Phân bổ lợi nhuận 49%</h5>
            </CardHeader>
            <CardContent>
              <div className="chart-container" style={{ position: "relative", height: "300px" }}>
                <canvas ref={profitChartRef} data-testid="profit-allocation-chart"></canvas>
              </div>
              <hr />
              <div className="mt-3">
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <div className="badge" style={{ backgroundColor: '#43B0A5', width: '12px', height: '12px', marginRight: '8px' }}></div>
                    <strong>Vốn (30%)</strong>
                  </div>
                  <div className="text-muted small ps-4">
                    {businessData?.profitAllocationBreakdown.capital.roles.join(', ')}
                  </div>
                </div>
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="badge" style={{ backgroundColor: '#ffc107', width: '12px', height: '12px', marginRight: '8px' }}></div>
                    <strong>Công (19%)</strong>
                  </div>
                  <div className="text-muted small ps-4">
                    {businessData?.profitAllocationBreakdown.labor.roles.join(', ')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <Card>
            <CardHeader>
              <h5 className="mb-0">
                <i className="bi bi-graph-up-arrow me-2"></i>
                Dự đoán ROI theo vai trò
              </h5>
            </CardHeader>
            <CardContent>
              <div className="table-responsive">
                <table className="table table-hover" data-testid="roi-predictions-table">
                  <thead>
                    <tr>
                      <th>Vai trò</th>
                      <th className="text-end">Đầu tư (triệu)</th>
                      <th className="text-end">6 tháng</th>
                      <th className="text-end">1 năm</th>
                      <th className="text-end">3 năm</th>
                      <th className="text-end">5 năm</th>
                      <th className="text-end">ROI 5 năm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessData?.roiPredictions.map((prediction, index) => (
                      <tr key={index} data-testid={`roi-row-${index}`}>
                        <td className="fw-semibold">{prediction.role}</td>
                        <td className="text-end">{prediction.investment.toLocaleString('vi-VN')}</td>
                        <td className="text-end">{prediction.sixMonths.toLocaleString('vi-VN')}₫</td>
                        <td className="text-end">{prediction.oneYear.toLocaleString('vi-VN')}₫</td>
                        <td className="text-end">{prediction.threeYears.toLocaleString('vi-VN')}₫</td>
                        <td className="text-end fw-bold" style={{ color: '#28a745' }}>
                          {prediction.fiveYears.toLocaleString('vi-VN')}₫
                        </td>
                        <td className="text-end">
                          <span className="badge bg-success" data-testid={`roi-percentage-${index}`}>
                            {prediction.fiveYearROI}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="alert alert-info mt-3" role="alert">
                <i className="bi bi-info-circle me-2"></i>
                <small>
                  Giá trị PAD Token dự đoán: 6 tháng (12.000₫), 1 năm (15.000₫), 3 năm (25.000₫), 5 năm (40.000₫)
                </small>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-6 mb-4">
          <Card>
            <CardHeader>
              <h5 className="mb-0">Trạng thái giới hạn thẻ</h5>
            </CardHeader>
            <CardContent>
              {businessData?.cardMaxoutStatus.map((card, index) => (
                <div key={index} className="mb-3" data-testid={`card-maxout-${index}`}>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="fw-semibold">{card.type}</span>
                    <span className="text-muted">{card.current}/{card.max}</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar ${getProgressVariant(card.percentage)}`}
                      role="progressbar"
                      style={{ width: `${card.percentage}%` }}
                      aria-valuenow={card.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <small className="text-muted">{card.percentage}% sử dụng</small>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-12 col-lg-6 mb-4">
          <Card>
            <CardHeader>
              <h5 className="mb-0">Bảng xếp hạng chi nhánh</h5>
            </CardHeader>
            <CardContent>
              <div className="table-responsive">
                <table className="table table-sm" data-testid="branches-ranking">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Chi nhánh</th>
                      <th>Điểm</th>
                      <th>KPI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessData?.topBranches.map((branch) => (
                      <tr key={branch.rank} data-testid={`branch-rank-${branch.rank}`}>
                        <td>
                          <span className={`badge ${branch.rank === 1 ? 'bg-warning' : branch.rank === 2 ? 'bg-secondary' : 'bg-info'}`}>
                            #{branch.rank}
                          </span>
                        </td>
                        <td className="fw-semibold">{branch.name}</td>
                        <td>{branch.score}</td>
                        <td>
                          <span className={`badge ${branch.kpi >= 85 ? 'bg-success' : branch.kpi >= 70 ? 'bg-warning' : 'bg-danger'}`}>
                            {branch.kpi}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

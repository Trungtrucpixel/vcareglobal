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
  ArrowUpCircle, 
  ArrowDownCircle, 
  PieChart, 
  FileText, 
  Upload, 
  Check, 
  X, 
  Clock,
  DollarSign,
  TrendingUp,
  Download
} from "lucide-react";
import jsPDF from "jspdf";

// Types
interface InvestmentPackage {
  id: string;
  name: string;
  minAmount: string;
  maxAmount?: string;
  description?: string;
  expectedReturn: string;
  duration: number;
  isActive: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  taxAmount?: string;
  packageId?: string;
  documentPath?: string;
  date: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface AssetContribution {
  id: string;
  userId: string;
  assetName: string;
  assetDescription?: string;
  valuationAmount: string;
  padTokenAmount: string;
  contractDocumentPath?: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  inheritanceRight: boolean;
  createdAt: string;
}

interface PadTokenHistory {
  date: string;
  amount: string;
  type: string;
  description: string;
}

interface RoiProjection {
  period: string;
  projectedReturn: number;
  totalValue: number;
}

// Utility functions
const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return numAmount.toLocaleString("vi-VN") + " VND";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN");
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completed": case "approved": return "default";
    case "pending": return "secondary";
    case "rejected": return "destructive";
    default: return "secondary";
  }
};

// Deposit/Investment Component
const DepositInvestment = () => {
  const [depositForm, setDepositForm] = useState({
    type: "deposit",
    amount: "",
    description: "",
    packageId: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: investmentPackages = [] } = useQuery<InvestmentPackage[]>({ 
    queryKey: ['/api/investment-packages/active'] 
  });

  const depositMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await apiRequest('POST', '/api/cash-flow/deposit', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Đã gửi yêu cầu nạp tiền thành công!" });
      setDepositForm({ type: "deposit", amount: "", description: "", packageId: "" });
      setDocumentFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow/transactions'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể gửi yêu cầu") });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!depositForm.amount || !depositForm.description || !depositForm.packageId) {
      toast({ variant: "destructive", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }

    const amount = parseFloat(depositForm.amount);
    const selectedPackage = investmentPackages.find(p => p.id === depositForm.packageId);
    
    if (selectedPackage && amount < parseFloat(selectedPackage.minAmount)) {
      toast({ 
        variant: "destructive", 
        description: `Số tiền tối thiểu cho gói này là ${formatCurrency(selectedPackage.minAmount)}` 
      });
      return;
    }

    depositMutation.mutate({
      ...depositForm,
      amount: amount
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5 text-green-500" />
          Nạp tiền / Đầu tư
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <Label htmlFor="type">Loại giao dịch</Label>
            <Select 
              value={depositForm.type} 
              onValueChange={(value) => setDepositForm(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger data-testid="select-transaction-type">
                <SelectValue placeholder="Chọn loại giao dịch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Nạp tiền</SelectItem>
                <SelectItem value="invest">Đầu tư</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investment Package */}
          <div>
            <Label htmlFor="packageId">Chọn gói đầu tư</Label>
            <Select 
              value={depositForm.packageId} 
              onValueChange={(value) => setDepositForm(prev => ({ ...prev, packageId: value }))}
            >
              <SelectTrigger data-testid="select-investment-package">
                <SelectValue placeholder="Chọn gói đầu tư" />
              </SelectTrigger>
              <SelectContent>
                {investmentPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - Tối thiểu: {formatCurrency(pkg.minAmount)} 
                    ({pkg.expectedReturn}% lãi suất/năm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Số tiền (VND)</Label>
            <Input
              type="number"
              value={depositForm.amount}
              onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Nhập số tiền"
              min="0"
              data-testid="input-deposit-amount"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              value={depositForm.description}
              onChange={(e) => setDepositForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả giao dịch..."
              rows={3}
              data-testid="textarea-deposit-description"
            />
          </div>

          {/* Document Upload */}
          <div>
            <Label htmlFor="document">Tài liệu đính kèm</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                data-testid="input-document-upload"
              />
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Hỗ trợ: PDF, JPG, PNG, DOC, DOCX (tối đa 10MB)
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={depositMutation.isPending}
            className="w-full"
            data-testid="button-submit-deposit"
          >
            {depositMutation.isPending ? "Đang xử lý..." : "Gửi yêu cầu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Withdrawal Component
const Withdrawal = () => {
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    description: "",
  });
  const { toast } = useToast();

  const withdrawalMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await apiRequest('POST', '/api/cash-flow/withdraw', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Đã gửi yêu cầu rút tiền thành công!" });
      setWithdrawalForm({ amount: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow/transactions'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể gửi yêu cầu") });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!withdrawalForm.amount || !withdrawalForm.description) {
      toast({ variant: "destructive", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }

    const amount = parseFloat(withdrawalForm.amount);
    if (amount < 5000000) {
      toast({ variant: "destructive", description: "Số tiền rút tối thiểu là 5,000,000 VND" });
      return;
    }

    withdrawalMutation.mutate({
      amount: amount,
      description: withdrawalForm.description
    });
  };

  const calculateTax = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount > 10000000) {
      return numAmount * 0.1; // 10% tax
    }
    return 0;
  };

  const amount = parseFloat(withdrawalForm.amount || "0");
  const taxAmount = calculateTax(withdrawalForm.amount);
  const netAmount = amount - taxAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownCircle className="h-5 w-5 text-blue-500" />
          Rút tiền
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertDescription>
            <strong>Quy định rút tiền:</strong> Số tiền tối thiểu 5,000,000 VND. 
            Thuế 10% áp dụng cho giao dịch trên 10,000,000 VND.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Số tiền rút (VND)</Label>
            <Input
              type="number"
              value={withdrawalForm.amount}
              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Nhập số tiền (tối thiểu 5,000,000 VND)"
              min="5000000"
              data-testid="input-withdrawal-amount"
            />
          </div>

          {/* Tax Calculation Display */}
          {amount > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Số tiền rút:</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Thuế (10%):</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-bold">
                <span>Số tiền thực nhận:</span>
                <span className="text-green-600">{formatCurrency(netAmount)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Lý do rút tiền</Label>
            <Textarea
              value={withdrawalForm.description}
              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Nhập lý do rút tiền..."
              rows={3}
              data-testid="textarea-withdrawal-description"
            />
          </div>

          <Button 
            type="submit" 
            disabled={withdrawalMutation.isPending || amount < 5000000}
            className="w-full"
            data-testid="button-submit-withdrawal"
          >
            {withdrawalMutation.isPending ? "Đang xử lý..." : "Gửi yêu cầu rút tiền"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Transaction History Component
const TransactionHistory = () => {
  const { data: transactions = [] } = useQuery<Transaction[]>({ 
    queryKey: ['/api/cash-flow/transactions'] 
  });

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Phúc An Đường - Báo cáo Giao dịch', 20, 20);
    
    // Date
    doc.setFontSize(12);
    doc.text(`Ngày tạo: ${formatDate(new Date().toISOString())}`, 20, 35);
    
    // Table header
    let yPos = 50;
    doc.setFontSize(10);
    doc.text('Ngày', 20, yPos);
    doc.text('Loại', 50, yPos);
    doc.text('Số tiền', 80, yPos);
    doc.text('Trạng thái', 120, yPos);
    doc.text('Mô tả', 150, yPos);
    
    // Table data
    yPos += 10;
    transactions.slice(0, 20).forEach((transaction) => { // Limit to 20 transactions
      if (yPos > 250) { // New page if needed
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(formatDate(transaction.date), 20, yPos);
      doc.text(transaction.type, 50, yPos);
      doc.text(formatCurrency(transaction.amount), 80, yPos);
      doc.text(transaction.status, 120, yPos);
      doc.text(transaction.description.substring(0, 20) + '...', 150, yPos);
      
      yPos += 10;
    });
    
    // Save
    doc.save(`phuc-an-duong-transactions-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          Lịch sử giao dịch
        </CardTitle>
        <Button 
          onClick={generatePDFReport}
          variant="outline" 
          size="sm"
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4 mr-2" />
          Tải PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Ngày</TableHead>
                <TableHead className="whitespace-nowrap">Loại</TableHead>
                <TableHead className="whitespace-nowrap">Số tiền</TableHead>
                <TableHead className="whitespace-nowrap">Thuế</TableHead>
                <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                <TableHead className="whitespace-nowrap">Mô tả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap" data-testid={`text-transaction-date-${transaction.id}`}>
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`text-transaction-type-${transaction.id}`}>
                    <Badge variant="outline">
                      {transaction.type === "deposit" ? "Nạp tiền" : 
                       transaction.type === "invest" ? "Đầu tư" :
                       transaction.type === "withdraw" ? "Rút tiền" : 
                       transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`text-transaction-amount-${transaction.id}`}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`text-transaction-tax-${transaction.id}`}>
                    {transaction.taxAmount ? formatCurrency(transaction.taxAmount) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`badge-transaction-status-${transaction.id}`}>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status === "pending" ? "Chờ duyệt" :
                       transaction.status === "approved" ? "Đã duyệt" :
                       transaction.status === "completed" ? "Hoàn thành" :
                       transaction.status === "rejected" ? "Từ chối" :
                       transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" data-testid={`text-transaction-description-${transaction.id}`}>
                    {transaction.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Chưa có giao dịch nào
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Dashboard Component
const CashFlowDashboard = () => {
  const { data: transactions = [] } = useQuery<Transaction[]>({ 
    queryKey: ['/api/cash-flow/transactions'] 
  });

  // Calculate statistics
  const totalDeposits = transactions
    .filter(t => t.type === "deposit" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === "withdraw" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const pendingTransactions = transactions.filter(t => t.status === "pending").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng nạp tiền</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-total-deposits">
                {formatCurrency(totalDeposits)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng rút tiền</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-total-withdrawals">
                {formatCurrency(totalWithdrawals)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Giao dịch chờ duyệt</p>
              <p className="text-2xl font-bold text-orange-600" data-testid="text-pending-transactions">
                {pendingTransactions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Asset Contribution Component
const AssetContribution = () => {
  const [assetForm, setAssetForm] = useState({
    assetName: "",
    assetDescription: "",
    valuationAmount: "",
    contractDocumentPath: "",
    inheritanceRight: false,
  });
  const { toast } = useToast();

  const { data: contributions = [] } = useQuery<AssetContribution[]>({ 
    queryKey: ['/api/contributions/asset'] 
  });

  const assetMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await apiRequest('POST', '/api/contributions/asset', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Đã gửi đề xuất góp tài sản thành công!" });
      setAssetForm({ 
        assetName: "", 
        assetDescription: "", 
        valuationAmount: "", 
        contractDocumentPath: "", 
        inheritanceRight: false 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contributions/asset'] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", description: "Lỗi: " + (error.message || "Không thể gửi đề xuất") });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assetForm.assetName || !assetForm.valuationAmount) {
      toast({ variant: "destructive", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }

    assetMutation.mutate(assetForm);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-500" />
            Góp tài sản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="assetName">Tên tài sản *</Label>
              <Input
                value={assetForm.assetName}
                onChange={(e) => setAssetForm(prev => ({ ...prev, assetName: e.target.value }))}
                placeholder="Ví dụ: Nhà đất, Thiết bị, Xe cộ..."
                data-testid="input-asset-name"
              />
            </div>

            <div>
              <Label htmlFor="assetDescription">Mô tả chi tiết</Label>
              <Textarea
                value={assetForm.assetDescription}
                onChange={(e) => setAssetForm(prev => ({ ...prev, assetDescription: e.target.value }))}
                placeholder="Mô tả tài sản, vị trí, tình trạng..."
                rows={4}
                data-testid="textarea-asset-description"
              />
            </div>

            <div>
              <Label htmlFor="valuationAmount">Giá trị định giá (VND) *</Label>
              <Input
                type="number"
                value={assetForm.valuationAmount}
                onChange={(e) => setAssetForm(prev => ({ ...prev, valuationAmount: e.target.value }))}
                placeholder="Nhập giá trị tài sản"
                min="0"
                data-testid="input-valuation-amount"
              />
              {assetForm.valuationAmount && (
                <p className="text-sm text-gray-600 mt-1">
                  VCA Token tương ứng: <strong>{((parseFloat(assetForm.valuationAmount) / 1000000) * 100).toFixed(2)} VCA</strong>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contractDocumentPath">Link hợp đồng/tài liệu</Label>
              <Input
                value={assetForm.contractDocumentPath}
                onChange={(e) => setAssetForm(prev => ({ ...prev, contractDocumentPath: e.target.value }))}
                placeholder="https://drive.google.com/..."
                data-testid="input-contract-path"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload tài liệu lên Google Drive hoặc nơi lưu trữ và dán link vào đây
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inheritanceRight"
                checked={assetForm.inheritanceRight}
                onChange={(e) => setAssetForm(prev => ({ ...prev, inheritanceRight: e.target.checked }))}
                className="h-4 w-4"
                data-testid="checkbox-inheritance-right"
              />
              <Label htmlFor="inheritanceRight" className="cursor-pointer">
                Tôi muốn áp dụng quyền kế thừa cho tài sản này (chỉ dành cho vai trò Sáng lập)
              </Label>
            </div>

            <Button 
              type="submit" 
              disabled={assetMutation.isPending}
              className="w-full"
              data-testid="button-submit-asset"
            >
              {assetMutation.isPending ? "Đang xử lý..." : "Gửi đề xuất góp tài sản"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách góp tài sản của tôi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên tài sản</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>VCA Token</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell data-testid={`text-asset-name-${contribution.id}`}>
                      {contribution.assetName}
                    </TableCell>
                    <TableCell data-testid={`text-asset-value-${contribution.id}`}>
                      {formatCurrency(contribution.valuationAmount)}
                    </TableCell>
                    <TableCell data-testid={`text-asset-pad-${contribution.id}`}>
                      {contribution.padTokenAmount} VCA
                    </TableCell>
                    <TableCell data-testid={`badge-asset-status-${contribution.id}`}>
                      <Badge variant={getStatusBadgeVariant(contribution.status)}>
                        {contribution.status === "pending" ? "Chờ duyệt" :
                         contribution.status === "approved" ? "Đã duyệt" :
                         contribution.status === "rejected" ? "Từ chối" :
                         contribution.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-asset-date-${contribution.id}`}>
                      {formatDate(contribution.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {contributions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Chưa có đóng góp tài sản nào
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// VCA Token Component
const PadToken = () => {
  const { data: history = [] } = useQuery<PadTokenHistory[]>({ 
    queryKey: ['/api/pad-token/history'] 
  });

  const { data: roiProjection = [] } = useQuery<RoiProjection[]>({ 
    queryKey: ['/api/pad-token/roi-projection'] 
  });

  return (
    <div className="space-y-6">
      {/* ROI Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Dự đoán lợi nhuận (ROI) theo thời gian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roiProjection.map((projection, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      {projection.period}
                    </p>
                    <p className="text-xl font-bold text-green-600 mb-1" data-testid={`text-roi-return-${index}`}>
                      +{formatCurrency(projection.projectedReturn)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Tổng giá trị: {formatCurrency(projection.totalValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {roiProjection.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu VCA Token để dự đoán
            </div>
          )}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Dự đoán ROI dựa trên tỷ lệ lợi nhuận trung bình 15%/năm. 
              Kết quả thực tế có thể khác biệt tùy theo tình hình kinh doanh.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* VCA Token History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            Lịch sử VCA Token
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại giao dịch</TableHead>
                  <TableHead>Số lượng VCA</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell data-testid={`text-pad-date-${index}`}>
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell data-testid={`text-pad-type-${index}`}>
                      <Badge variant="outline">
                        {item.type === "deposit" ? "Nạp tiền" : 
                         item.type === "invest" ? "Đầu tư" :
                         item.type === "asset" ? "Góp tài sản" : 
                         item.type}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-pad-amount-${index}`}>
                      <span className="font-medium text-green-600">
                        +{item.amount} VCA
                      </span>
                    </TableCell>
                    <TableCell data-testid={`text-pad-description-${index}`}>
                      {item.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Chưa có lịch sử VCA Token
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main Cash Flow Tab Component
export default function CashFlowTab() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dòng tiền & Giao dịch
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Quản lý nạp tiền, đầu tư, rút tiền và theo dõi giao dịch
        </p>
      </div>

      <CashFlowDashboard />

      <Tabs defaultValue="deposit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="deposit" data-testid="tab-deposit">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Nạp tiền/Đầu tư
          </TabsTrigger>
          <TabsTrigger value="withdraw" data-testid="tab-withdraw">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Rút tiền
          </TabsTrigger>
          <TabsTrigger value="asset" data-testid="tab-asset">
            <Upload className="h-4 w-4 mr-2" />
            Góp tài sản
          </TabsTrigger>
          <TabsTrigger value="padtoken" data-testid="tab-padtoken">
            <DollarSign className="h-4 w-4 mr-2" />
            VCA Token
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <FileText className="h-4 w-4 mr-2" />
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <DepositInvestment />
        </TabsContent>

        <TabsContent value="withdraw">
          <Withdrawal />
        </TabsContent>

        <TabsContent value="asset">
          <AssetContribution />
        </TabsContent>

        <TabsContent value="padtoken">
          <PadToken />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
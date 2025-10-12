import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, QrCode, Users, AlertTriangle, CreditCard } from "lucide-react";
import type { Card as CardType, InsertCard } from "@shared/schema";

interface CardTypePricing {
  type: string;
  price: number;
  maxSessions: number;
}

interface CardBenefits {
  cardId: string;
  cardType: string;
  price: number;
  currentShares: number;
  shareValue: number;
  maxoutLimit: number;
  maxoutPercentage: number;
  status: string;
  connectionCommission: number;
  vipSupport: number;
  profitSharePercentage: number;
  padToken: number;
  consultationSessions: number;
  isNearMaxout: boolean;
}

export default function CardsTab() {
  const { toast } = useToast();
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCardForBenefits, setSelectedCardForBenefits] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<InsertCard>({
    cardNumber: "",
    cardType: "",
    customerName: "",
    price: "2000000",
    remainingSessions: 0,
    status: "active",
  });

  // Queries
  const { data: cards = [], isLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  const { data: cardTypes = [] } = useQuery<CardTypePricing[]>({
    queryKey: ["/api/cards/types"],
  });

  const { data: cardBenefits } = useQuery<CardBenefits>({
    queryKey: ["/api/cards", selectedCardForBenefits, "benefits"],
    enabled: !!selectedCardForBenefits,
  });

  // Mutations
  const createCardMutation = useMutation({
    mutationFn: async (cardData: InsertCard) => {
      // Calculate maxout limit and set sessions based on card type
      const selectedType = cardTypes.find(t => t.type === cardData.cardType);
      const enrichedData = {
        ...cardData,
        remainingSessions: selectedType?.maxSessions || 0,
        maxoutLimit: (parseFloat(cardData.price) * 2.1).toString(),
        currentShares: "0",
        shareHistory: "",
        connectionCommission: "8.0",
        vipSupport: "5.0"
      };
      
      const res = await apiRequest("POST", "/api/cards", enrichedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      resetForm();
      toast({
        title: "Thành công",
        description: "Thẻ đã được tạo thành công",
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

  const updateCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCard> }) => {
      const res = await apiRequest("PUT", `/api/cards/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      resetForm();
      toast({
        title: "Thành công", 
        description: "Thẻ đã được cập nhật thành công",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ cardId, sessionType }: { cardId: string; sessionType: string }) => {
      const res = await apiRequest("POST", `/api/cards/${cardId}/checkin`, { 
        sessionType,
        notes: "QR Code check-in"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({
        title: "Check-in thành công",
        description: "Đã ghi nhận phiên trị liệu",
      });
    },
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      cardNumber: "",
      cardType: "",
      customerName: "",
      price: "2000000",
      remainingSessions: 0,
      status: "active",
    });
    setEditingCard(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCard) {
      updateCardMutation.mutate({ id: editingCard.id, data: formData });
    } else {
      createCardMutation.mutate(formData);
    }
  };

  const handleEdit = (card: CardType) => {
    setEditingCard(card);
    setFormData({
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      customerName: card.customerName,
      price: card.price,
      remainingSessions: card.remainingSessions || 0,
      status: card.status,
    });
  };

  const handleCardTypeChange = (cardType: string) => {
    const selectedType = cardTypes.find(t => t.type === cardType);
    setFormData(prev => ({
      ...prev,
      cardType,
      price: selectedType ? selectedType.price.toString() : "2000000",
      remainingSessions: selectedType?.maxSessions || 0
    }));
  };

  const simulateQRScan = (cardId: string) => {
    checkInMutation.mutate({ cardId, sessionType: "therapy" });
  };

  const getCardStatusBadge = (card: CardType) => {
    const price = parseFloat(card.price);
    const currentShares = parseFloat(card.currentShares || "0");
    const maxoutLimit = price * 2.1;
    const shareValue = currentShares * 1000000;
    const percentage = (shareValue / maxoutLimit) * 100;

    if (percentage >= 100) {
      return <Badge variant="destructive">Stopped</Badge>;
    } else if (percentage >= 90) {
      return <Badge variant="secondary">Near Maxout</Badge>;
    } else if (currentShares > 0) {
      return <Badge variant="default">Shared</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  const filteredCards = cards.filter(card =>
    card.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.cardNumber.includes(searchTerm) ||
    card.cardType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nearMaxoutCards = cards.filter(card => {
    const price = parseFloat(card.price);
    const currentShares = parseFloat(card.currentShares || "0");
    const shareValue = currentShares * 1000000;
    const maxoutLimit = price * 2.1;
    return (shareValue / maxoutLimit) >= 0.9;
  });

  if (isLoading) {
    return <div className="text-center py-4">Đang tải...</div>;
  }

  return (
    <div>
      {/* Alerts for Near Maxout Cards */}
      {nearMaxoutCards.length > 0 && (
        <div className="mb-4">
          {nearMaxoutCards.map((card) => (
            <Alert key={card.id} className="mb-2 alert-warning" data-testid={`maxout-alert-${card.id}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cảnh báo:</strong> Thẻ {card.cardType} của {card.customerName} sắp đạt giới hạn Maxout!
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="row">
        {/* Card Management Form */}
        <div className="col-12 col-lg-4 mb-4">
          <Card>
            <CardHeader>
              <h5 className="mb-0 d-flex align-items-center">
                <CreditCard className="me-2" />
                {editingCard ? "Chỉnh sửa thẻ" : "Tạo thẻ mới"}
              </h5>
              {editingCard && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetForm}
                  data-testid="button-cancel-edit"
                >
                  Hủy
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} data-testid="card-form">
                <div className="mb-3">
                  <Label htmlFor="cardType">Loại thẻ *</Label>
                  <Select 
                    value={formData.cardType} 
                    onValueChange={handleCardTypeChange}
                    required
                  >
                    <SelectTrigger className="form-control-lg" data-testid="select-card-type">
                      <SelectValue placeholder="Chọn loại thẻ" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardTypes.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {type.type} - {(type.price / 1000000).toLocaleString('vi-VN')}M VND
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-3">
                  <Label htmlFor="customerName">Tên khách hàng *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    required
                    className="form-control-lg"
                    data-testid="input-customer-name"
                  />
                </div>

                <div className="mb-3">
                  <Label htmlFor="cardNumber">Số thẻ *</Label>
                  <Input
                    id="cardNumber"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="1234-5678-9012-3456"
                    required
                    className="form-control-lg"
                    data-testid="input-card-number"
                  />
                </div>

                <div className="mb-3">
                  <Label htmlFor="price">Giá trị thẻ (VND)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="form-control-lg"
                    data-testid="input-price"
                    disabled={!!formData.cardType} // Auto-set by card type
                  />
                </div>

                <div className="mb-3">
                  <Label htmlFor="remainingSessions">Số phiên còn lại</Label>
                  <Input
                    id="remainingSessions"
                    type="number"
                    value={formData.remainingSessions || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, remainingSessions: parseInt(e.target.value) || 0 }))}
                    className="form-control-lg"
                    data-testid="input-sessions"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-100 btn-lg"
                  disabled={createCardMutation.isPending || updateCardMutation.isPending}
                  data-testid="button-submit-card"
                >
                  {editingCard ? "Cập nhật thẻ" : "Tạo thẻ mới"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Card Search and List */}
        <div className="col-12 col-lg-8 mb-4">
          <Card>
            <CardHeader>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                <h5 className="mb-2 mb-md-0">Danh sách thẻ khách hàng</h5>
                <div className="d-flex align-items-center">
                  <div className="input-group" style={{ maxWidth: "300px" }}>
                    <Input
                      type="text"
                      placeholder="Tìm kiếm thẻ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-control-lg"
                      data-testid="input-search"
                    />
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="row">
                {filteredCards.map((card) => (
                  <div key={card.id} className="col-12 col-md-6 mb-3" data-testid={`card-${card.id}`}>
                    <Card className="h-100">
                      <CardContent className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1 fw-bold" data-testid={`card-customer-${card.id}`}>
                              {card.customerName}
                            </h6>
                            <small className="text-muted">
                              ****-****-****-{card.cardNumber.slice(-4)}
                            </small>
                          </div>
                          {getCardStatusBadge(card)}
                        </div>
                        
                        <div className="mb-2">
                          <Badge variant="outline" className="me-2">
                            {card.cardType}
                          </Badge>
                          <small className="text-muted">
                            {(parseFloat(card.price) / 1000000).toLocaleString('vi-VN')}M VND
                          </small>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small>Phiên còn lại:</small>
                            <Badge variant={card.remainingSessions! > 5 ? "default" : "secondary"}>
                              {card.remainingSessions || 0}
                            </Badge>
                          </div>
                          
                          <div className="progress" style={{ height: "6px" }}>
                            <div
                              className="progress-bar bg-primary"
                              role="progressbar"
                              style={{ 
                                width: `${Math.min(100, ((card.remainingSessions || 0) / 10) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 btn-lg"
                            onClick={() => simulateQRScan(card.id)}
                            disabled={!card.remainingSessions || card.remainingSessions <= 0}
                            data-testid={`button-checkin-${card.id}`}
                          >
                            <QrCode className="h-4 w-4 me-1" />
                            Check-in
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(card)}
                            data-testid={`button-edit-${card.id}`}
                          >
                            Sửa
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCardForBenefits(card.id)}
                            data-testid={`button-benefits-${card.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
                
                {filteredCards.length === 0 && (
                  <div className="col-12">
                    <div className="text-center py-4 text-muted" data-testid="empty-cards">
                      {searchTerm ? "Không tìm thấy thẻ nào" : "Chưa có thẻ nào được tạo"}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Benefits Analysis Modal */}
      {selectedCardForBenefits && cardBenefits && (
        <div className="row mt-4">
          <div className="col-12">
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Phân tích lợi ích thẻ</h5>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedCardForBenefits(null)}
                  >
                    Đóng
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="text-center p-4 rounded" style={{ backgroundColor: '#e8f5f3', border: '2px solid #43B0A5' }}>
                      <h6 className="text-muted mb-2">
                        <i className="bi bi-coin me-2"></i>
                        VCA Token
                      </h6>
                      <div className="display-5 fw-bold" style={{ color: '#43B0A5' }} data-testid="card-pad-token">
                        {cardBenefits.padToken.toLocaleString('vi-VN')} VCA
                      </div>
                      <small className="text-muted">
                        Giá trị: {(cardBenefits.padToken / 100).toLocaleString('vi-VN')} triệu VNĐ
                      </small>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 col-md-3 mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-primary">Kết nối</h6>
                      <div className="display-6 fw-bold">{cardBenefits.connectionCommission}%</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-3 mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-success">VIP</h6>
                      <div className="display-6 fw-bold">{cardBenefits.vipSupport}%</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-3 mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-info">Lợi tức</h6>
                      <div className="display-6 fw-bold">{cardBenefits.profitSharePercentage}%</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-3 mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-warning">Maxout</h6>
                      <div className="display-6 fw-bold">{cardBenefits.maxoutPercentage.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h6>
                    <i className="bi bi-heart-pulse me-2"></i>
                    Dịch vụ tư vấn sức khỏe
                  </h6>
                  <div className="alert alert-info" role="alert">
                    <strong>{cardBenefits.consultationSessions} lượt</strong> tư vấn sức khỏe miễn phí trong 2 năm
                  </div>
                </div>

                <div className="mt-3">
                  <h6>Chi tiết quyền lợi:</h6>
                  <ul className="list-unstyled">
                    <li>💰 Giá trị thẻ: {(cardBenefits.price / 1000000).toLocaleString('vi-VN')}M VNĐ</li>
                    <li>🪙 VCA Token: {cardBenefits.padToken.toLocaleString('vi-VN')} VCA (100 VCA = 1 triệu VNĐ)</li>
                    <li>📈 Cổ phần hiện tại: {cardBenefits.currentShares.toLocaleString('vi-VN')}</li>
                    <li>🎯 Giới hạn Maxout: {(cardBenefits.maxoutLimit / 1000000).toLocaleString('vi-VN')}M VNĐ</li>
                    <li>🔗 Hoa hồng kết nối: {cardBenefits.connectionCommission}%</li>
                    <li>👑 Hỗ trợ VIP: {cardBenefits.vipSupport}%</li>
                    <li>💸 Chia sẻ lợi nhuận sau thuế: {cardBenefits.profitSharePercentage}%</li>
                    <li>🏥 Tư vấn sức khỏe: {cardBenefits.consultationSessions} lượt/2 năm</li>
                    <li>🔄 Quy tắc: 1M VNĐ = 1 Cổ phần, Maxout tại 210% giá trị thẻ</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
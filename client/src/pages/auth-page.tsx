import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "login") {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else if (mode === "register") {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: "customer", // Default role for new registrations
      });
    } else if (mode === "forgot") {
      // TODO: Implement forgot password functionality
      alert("Chức năng quên mật khẩu đang được phát triển. Vui lòng liên hệ quản trị viên.");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-6 col-lg-4">
            <Card className="border-0 shadow-lg" style={{ borderRadius: "20px" }}>
              <CardHeader className="text-center pt-5 pb-4">
                <h1 className="fw-bold mb-0" style={{ 
                  color: "#43B0A5", 
                  fontSize: "2rem",
                  fontWeight: "600"
                }}>
                  {mode === "login" ? "Đăng nhập" : mode === "register" ? "Đăng ký" : "Quên mật khẩu"}<br />
                  Phúc An Đường
                </h1>
              </CardHeader>
              
              <CardContent className="px-5 pb-5">
                <form onSubmit={handleSubmit} data-testid="auth-form">
                  {mode === "register" && (
                    <div className="mb-4">
                      <Label htmlFor="name" className="form-label text-dark fw-medium mb-2">
                        Họ và tên
                      </Label>
                      <Input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Nhập họ và tên"
                        required
                        className="form-control-lg"
                        style={{ 
                          borderRadius: "12px", 
                          minHeight: "50px",
                          border: "1px solid #ddd",
                          fontSize: "16px"
                        }}
                        data-testid="input-name"
                      />
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <Label htmlFor="email" className="form-label text-dark fw-medium mb-2">
                      {mode === "forgot" ? "Email khôi phục" : "Tên đăng nhập"}
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder={mode === "forgot" ? "Nhập email của bạn" : "Nhập tên đăng nhập"}
                      required
                      className="form-control-lg"
                      style={{ 
                        borderRadius: "12px", 
                        minHeight: "50px",
                        border: "1px solid #ddd",
                        fontSize: "16px"
                      }}
                      data-testid="input-email"
                    />
                  </div>
                  
                  {mode !== "forgot" && (
                    <div className="mb-4">
                      <Label htmlFor="password" className="form-label text-dark fw-medium mb-2">
                        Mật khẩu
                      </Label>
                      <Input
                        type="password"
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Nhập mật khẩu"
                        required
                        className="form-control-lg"
                        style={{ 
                          borderRadius: "12px", 
                          minHeight: "50px",
                          border: "1px solid #ddd",
                          fontSize: "16px"
                        }}
                        data-testid="input-password"
                      />
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="d-flex justify-content-between mb-4">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ color: "#43B0A5", fontSize: "14px" }}
                        onClick={() => setMode("forgot")}
                        data-testid="link-forgot-password"
                      >
                        Quên mật khẩu?
                      </button>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ color: "#43B0A5", fontSize: "14px" }}
                        onClick={() => setMode("register")}
                        data-testid="link-register"
                      >
                        Đăng ký mới
                      </button>
                    </div>
                  )}
                  
                  {(mode === "register" || mode === "forgot") && (
                    <div className="text-center mb-4">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none"
                        style={{ color: "#43B0A5", fontSize: "14px" }}
                        onClick={() => setMode("login")}
                        data-testid="link-back-to-login"
                      >
                        ← Quay lại đăng nhập
                      </button>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-100"
                    style={{ 
                      backgroundColor: "#43B0A5",
                      border: "none",
                      borderRadius: "12px", 
                      minHeight: "50px",
                      fontSize: "16px",
                      fontWeight: "600"
                    }}
                    disabled={loginMutation.isPending || registerMutation.isPending}
                    data-testid="button-submit"
                  >
                    {loginMutation.isPending || registerMutation.isPending ? 
                      (
                        mode === "login" ? "Đang đăng nhập..." : 
                        mode === "register" ? "Đang đăng ký..." : "Đang xử lý..."
                      ) : 
                      (
                        mode === "login" ? "Đăng nhập" : 
                        mode === "register" ? "Đăng ký" : "Gửi yêu cầu"
                      )
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
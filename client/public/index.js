// Homepage JavaScript for Phúc An Dương
class HomepageManager {
    constructor() {
        this.stats = {};
        this.selectedCard = null;
        this.registrationData = null;
        this.currentUser = null; // Store current user data
        this.init();
    }

    async init() {
        await this.loadHomeStats();
        this.setupEventListeners();
        this.populateCardTypes();
        this.setupCardSelection();
        this.setupRoleSelection();
        this.setupFormSubmission();
        this.startAutoRefresh();
    }

    // Load home statistics from backend
    async loadHomeStats() {
        try {
            const response = await fetch('/');
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatistics();
            } else {
                console.error('Failed to load home stats');
                this.showFallbackStats();
            }
        } catch (error) {
            console.error('Error loading home stats:', error);
            this.showFallbackStats();
        }
    }

    // Update statistics display with dynamic data
    updateStatistics() {
        // Main statistics
        if (this.stats.activeCards !== undefined) {
            document.getElementById('activeCards').innerHTML = `${this.stats.activeCards}+`;
            document.getElementById('activeCardsDetail').textContent = `Tổng ${this.stats.activeCards} thẻ đang hoạt động`;
        }
        
        if (this.stats.totalBranches !== undefined) {
            document.getElementById('totalBranches').innerHTML = `${this.stats.totalBranches}+`;
            document.getElementById('totalBranchesDetail').textContent = `Liên kết với ${this.stats.totalBranches} chi nhánh`;
        }
        
        if (this.stats.profitSharingPercentage !== undefined) {
            document.getElementById('profitSharing').innerHTML = `${this.stats.profitSharingPercentage}%`;
            document.getElementById('profitSharingDetail').textContent = `Chia lãi minh bạch ${this.stats.profitSharingPercentage}%`;
        }

        // Additional statistics
        if (this.stats.totalUsers !== undefined) {
            document.getElementById('totalUsers').textContent = this.formatNumber(this.stats.totalUsers);
        }
        
        if (this.stats.totalPadTokenDistributed !== undefined) {
            document.getElementById('totalPadToken').textContent = this.formatNumber(this.stats.totalPadTokenDistributed);
        }
        
        if (this.stats.monthlyGrowth !== undefined) {
            document.getElementById('monthlyGrowth').textContent = `+${this.stats.monthlyGrowth}%`;
        }
        
        if (this.stats.totalRevenue !== undefined) {
            document.getElementById('totalRevenue').textContent = this.formatCurrency(this.stats.totalRevenue);
        }

        // Recent activity
        if (this.stats.recentActivity) {
            if (this.stats.recentActivity.newRegistrations !== undefined) {
                document.getElementById('newRegistrations').textContent = this.stats.recentActivity.newRegistrations;
            }
            if (this.stats.recentActivity.newCards !== undefined) {
                document.getElementById('newCards').textContent = this.stats.recentActivity.newCards;
            }
            if (this.stats.recentActivity.totalInvestment !== undefined) {
                document.getElementById('totalInvestment').textContent = this.formatCurrency(this.stats.recentActivity.totalInvestment);
            }
        }

        // Update last updated timestamp
        if (this.stats.lastUpdated) {
            const lastUpdated = new Date(this.stats.lastUpdated);
            document.getElementById('lastUpdated').innerHTML = `
                <i class="fas fa-clock mr-2"></i>
                Cập nhật lần cuối: ${lastUpdated.toLocaleString('vi-VN')}
            `;
        }
    }

    // Show fallback statistics if API fails
    showFallbackStats() {
        document.getElementById('activeCards').innerHTML = '400+';
        document.getElementById('totalBranches').innerHTML = '10+';
        document.getElementById('profitSharing').innerHTML = '49%';
        
        // Show fallback for additional stats
        document.getElementById('totalUsers').textContent = '-';
        document.getElementById('totalPadToken').textContent = '-';
        document.getElementById('monthlyGrowth').textContent = '-';
        document.getElementById('totalRevenue').textContent = '-';
        document.getElementById('newRegistrations').textContent = '-';
        document.getElementById('newCards').textContent = '-';
        document.getElementById('totalInvestment').textContent = '-';
        
        document.getElementById('lastUpdated').innerHTML = `
            <i class="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
            Không thể tải dữ liệu từ server
        `;
    }

    // Format number with Vietnamese locale
    formatNumber(num) {
        if (num === undefined || num === null) return '-';
        return new Intl.NumberFormat('vi-VN').format(num);
    }

    // Format currency in VNĐ
    formatCurrency(amount) {
        if (amount === undefined || amount === null) return '-';
        if (amount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)}B VNĐ`;
        } else if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M VNĐ`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K VNĐ`;
        } else {
            return `${this.formatNumber(amount)} VNĐ`;
        }
    }

    // Auto-refresh data every 30 seconds
    startAutoRefresh() {
        setInterval(() => {
            this.loadHomeStats();
        }, 30000); // 30 seconds
    }

    // Setup event listeners
    setupEventListeners() {
        // Register button
        const registerButton = document.getElementById('register-button');
        if (registerButton) {
            registerButton.addEventListener('click', () => this.openCardModal());
        }

        // Close modal button
        const closeModalButton = document.getElementById('close-modal');
        if (closeModalButton) {
            closeModalButton.addEventListener('click', () => this.closeCardModal());
        }

        // Cancel registration button
        const cancelButton = document.getElementById('cancel-registration');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.closeCardModal());
        }

        // FAQ toggle
        this.setupFaqToggle();
    }

    // Setup card selection
    setupCardSelection() {
        const cardOptions = document.querySelectorAll('.card-option');
        cardOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                cardOptions.forEach(opt => {
                    opt.classList.remove('border-blue-500', 'bg-blue-50');
                    opt.classList.add('border-gray-200');
                });
                
                // Add selection to clicked option
                option.classList.remove('border-gray-200');
                option.classList.add('border-blue-500', 'bg-blue-50');
                
                // Store selected card
                this.selectedCard = option.dataset.card;
                
                // Update benefits display
                this.updateBenefitsDisplay();
            });
        });
    }

    // Setup role selection
    setupRoleSelection() {
        const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
        roleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBenefitsDisplay();
            });
        });
    }

    // Setup form submission
    setupFormSubmission() {
        const form = document.getElementById('registration-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitRegistration();
            });
        }
    }

    // Update benefits display based on selections
    updateBenefitsDisplay() {
        const benefitsDisplay = document.getElementById('benefits-display');
        const benefitsContent = document.getElementById('benefits-content');
        
        if (!benefitsDisplay || !benefitsContent) return;

        let benefits = [];
        
        // Card benefits
        if (this.selectedCard && this.selectedCard !== '') {
            const cardData = this.getCardData(this.selectedCard);
            if (cardData) {
                benefits.push(`<div class="flex items-center"><i class="fas fa-id-card text-blue-600 mr-2"></i><span>Thẻ ${cardData.name}: ${cardData.sessions} lượt tư vấn/2 năm</span></div>`);
                benefits.push(`<div class="flex items-center"><i class="fas fa-coins text-yellow-600 mr-2"></i><span>VCA Token: ${cardData.padToken} VCA</span></div>`);
                benefits.push(`<div class="flex items-center"><i class="fas fa-qrcode text-green-600 mr-2"></i><span>Check-in QR code</span></div>`);
            }
        }

        // Role benefits
        const selectedRoles = Array.from(document.querySelectorAll('input[name="roles"]:checked')).map(cb => cb.value);
        if (selectedRoles.length > 0) {
            benefits.push(`<div class="flex items-center"><i class="fas fa-users text-purple-600 mr-2"></i><span>Vai trò: ${selectedRoles.join(', ')}</span></div>`);
            
            // Calculate VCA Token bonus for roles
            const investmentAmount = parseInt(document.getElementById('reg-investment').value) || 0;
            if (investmentAmount > 0) {
                const totalRolePadToken = selectedRoles.reduce((total, role) => {
                    return total + this.calculateRolePadToken(role, investmentAmount);
                }, 0);
                benefits.push(`<div class="flex items-center"><i class="fas fa-star text-orange-600 mr-2"></i><span>VCA Token bonus vai trò: ${totalRolePadToken} VCA</span></div>`);
            }
        }

        // General benefits
        benefits.push(`<div class="flex items-center"><i class="fas fa-percentage text-red-600 mr-2"></i><span>Referral 8% & VIP 5%</span></div>`);
        benefits.push(`<div class="flex items-center"><i class="fas fa-chart-line text-green-600 mr-2"></i><span>Chia lãi 49% minh bạch</span></div>`);
        benefits.push(`<div class="flex items-center"><i class="fas fa-shield-alt text-blue-600 mr-2"></i><span>Bảo vệ 100% quyền lợi</span></div>`);

        if (benefits.length > 0) {
            benefitsContent.innerHTML = benefits.join('');
            benefitsDisplay.classList.remove('hidden');
        } else {
            benefitsDisplay.classList.add('hidden');
        }
    }

    // Get card data
    getCardData(cardType) {
        const cardTypes = {
            'Standard': { name: 'Standard', sessions: 12, padToken: 1200, price: 12000000 },
            'Silver': { name: 'Silver', sessions: 15, padToken: 1500, price: 15000000 },
            'Gold': { name: 'Gold', sessions: 18, padToken: 1800, price: 18000000 },
            'Platinum': { name: 'Platinum', sessions: 21, padToken: 2100, price: 21000000 },
            'Diamond': { name: 'Diamond', sessions: 24, padToken: 2400, price: 24000000 }
        };
        return cardTypes[cardType];
    }

    // Calculate VCA Token for role
    calculateRolePadToken(roleName, investmentAmount) {
        const roleMultipliers = {
            "Cổ đông": 2.0,
            "Angel": 1.5,
            "Seed": 1.2,
            "Retail": 1.0,
            "Sáng lập": 3.0,
            "Thiên thần": 2.5,
            "Phát triển": 1.8,
            "Đồng hành": 1.3
        };
        
        const multiplier = roleMultipliers[roleName] || 1.0;
        const basePadToken = (investmentAmount / 1000000) * 100; // 100 VCA = 1 million VNĐ
        return Math.round(basePadToken * multiplier);
    }

    // Submit registration
    async submitRegistration() {
        const form = document.getElementById('registration-form');
        const submitButton = document.getElementById('submit-registration');
        
        // Get form data
        const formData = {
            email: document.getElementById('reg-email').value,
            phone: document.getElementById('reg-phone').value,
            name: document.getElementById('reg-name').value,
            cardType: this.selectedCard || null,
            roles: Array.from(document.querySelectorAll('input[name="roles"]:checked')).map(cb => cb.value),
            investmentAmount: parseInt(document.getElementById('reg-investment').value) || 0,
            referralCode: document.getElementById('reg-referral').value || null,
            redirectToCardSelection: true // Always redirect to card selection
        };

        // Validate required fields
        if (!formData.email || !formData.phone || !formData.name) {
            this.showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Đăng ký thành công!', 'success');
                this.displayRegistrationResult(result.data);
                this.closeCardModal();
                this.resetForm();
                
                // Store user data for card selection
                this.currentUser = result.data.user;
                
                // Always show card selection interface
                this.openCardSelection();
            } else {
                this.showNotification(result.message || 'Đăng ký thất bại', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Lỗi kết nối. Vui lòng thử lại.', 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Đăng ký ngay';
        }
    }

    // Display registration result
    displayRegistrationResult(data) {
        const message = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 class="font-semibold text-green-800 mb-2">Đăng ký thành công!</h3>
                <div class="space-y-1 text-sm text-green-700">
                    <p><strong>Họ tên:</strong> ${data.user.name}</p>
                    <p><strong>Email:</strong> ${data.user.email}</p>
                    <p><strong>VCA Token nhận được:</strong> ${data.padTokenEarned}</p>
                    <p><strong>Tổng VCA Token:</strong> ${data.totalPadToken}</p>
                    ${data.card ? `<p><strong>Thẻ:</strong> ${data.card.type} - ${parseInt(data.card.price).toLocaleString('vi-VN')} VNĐ</p>` : ''}
                    ${data.roles.length > 0 ? `<p><strong>Vai trò:</strong> ${data.roles.join(', ')}</p>` : ''}
                </div>
            </div>
        `;
        
        // You can customize where to show this message
        console.log('Registration successful:', data);
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('registration-form');
        if (form) {
            form.reset();
        }
        
        // Reset card selection
        document.querySelectorAll('.card-option').forEach(option => {
            option.classList.remove('border-blue-500', 'bg-blue-50');
            option.classList.add('border-gray-200');
        });
        
        this.selectedCard = null;
        document.getElementById('benefits-display').classList.add('hidden');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Open registration modal
    openRegisterModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this.resetForm();
        }
    }

    // Close registration modal
    closeRegisterModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    // Open card modal (legacy support)
    openCardModal() {
        this.openRegisterModal();
    }

    // Close card modal (legacy support)
    closeCardModal() {
        this.closeRegisterModal();
    }

    // Open card selection interface
    openCardSelection() {
        const modal = document.getElementById('cardSelectionModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    // Close card selection interface
    closeCardSelection() {
        const modal = document.getElementById('cardSelectionModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    // Go back to registration form
    goToRegistration() {
        this.closeCardSelection();
        this.openCardModal();
    }

    // Buy card package
    async buyCardPackage(cardType, price, sessions) {
        try {
            // Check if we have current user data
            if (!this.currentUser) {
                this.showNotification('Vui lòng đăng ký trước khi mua gói thẻ', 'error');
                return;
            }

            // Show loading notification
            this.showNotification('Đang xử lý đơn hàng...', 'info');

            const response = await fetch('/api/buy-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    cardType: cardType,
                    price: price,
                    sessions: sessions,
                    paymentMethod: 'bank_transfer',
                    paymentStatus: 'pending', // Default to pending for offline payment
                    notes: `Mua thẻ ${cardType} từ giao diện chọn gói`
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.displayPurchaseResult(result.data, cardType, price, sessions, result.paymentInstructions);
                this.closeCardSelection();
            } else {
                this.showNotification(result.message || 'Mua gói thất bại', 'error');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            this.showNotification('Lỗi kết nối. Vui lòng thử lại.', 'error');
        }
    }

    // Display purchase result
    displayPurchaseResult(data, cardType, price, sessions, paymentInstructions = null) {
        const isPaymentPending = data.paymentInfo && data.paymentInfo.status === 'pending';
        
        const message = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <h3 class="font-semibold text-green-800 mb-3 text-lg">
                    <i class="fas fa-${isPaymentPending ? 'clock' : 'check-circle'} mr-2"></i>
                    ${isPaymentPending ? 'Đơn hàng đã được tạo!' : 'Mua gói thành công!'}
                </h3>
                <div class="space-y-2 text-sm text-green-700">
                    <p><strong>Gói thẻ:</strong> ${cardType}</p>
                    <p><strong>Giá:</strong> ${this.formatCurrency(price)}</p>
                    <p><strong>Lượt tư vấn:</strong> ${sessions} lượt/2 năm</p>
                    <p><strong>VCA Token nhận được:</strong> ${data.padTokenEarned || 0}</p>
                    <p><strong>Tổng VCA Token:</strong> ${data.user.totalPadToken}</p>
                    <p><strong>Họ tên:</strong> ${data.user.name}</p>
                    <p><strong>Email:</strong> ${data.user.email}</p>
                    <p><strong>Trạng thái thẻ:</strong> ${data.card.status}</p>
                    <p><strong>Trạng thái thanh toán:</strong> ${data.paymentInfo.status}</p>
                </div>
                ${isPaymentPending ? this.getPaymentInstructionsHTML(paymentInstructions) : ''}
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <i class="fas fa-info-circle mr-2"></i>
                        Thông tin gói thẻ đã được gửi đến email của bạn. 
                        Vui lòng kiểm tra hộp thư để xem chi tiết.
                    </p>
                </div>
            </div>
        `;
        
        console.log('Purchase result:', data);
        
        // Show success modal with payment info
        this.showSuccessModal(cardType, price, sessions, data, paymentInstructions);
    }

    // Get payment instructions HTML
    getPaymentInstructionsHTML(paymentInstructions) {
        if (!paymentInstructions) return '';
        
        return `
            <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 class="font-semibold text-yellow-800 mb-3">
                    <i class="fas fa-credit-card mr-2"></i>Hướng dẫn thanh toán
                </h4>
                <div class="space-y-2 text-sm text-yellow-700">
                    <p><strong>Ngân hàng:</strong> ${paymentInstructions.bankInfo.bankName}</p>
                    <p><strong>Số tài khoản:</strong> ${paymentInstructions.bankInfo.accountNumber}</p>
                    <p><strong>Tên tài khoản:</strong> ${paymentInstructions.bankInfo.accountName}</p>
                    <p><strong>Số tiền:</strong> ${this.formatCurrency(paymentInstructions.bankInfo.amount)}</p>
                    <p><strong>Nội dung:</strong> ${paymentInstructions.bankInfo.content}</p>
                </div>
                <div class="mt-3">
                    <a href="${paymentInstructions.qrCode}" target="_blank" 
                       class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                        <i class="fas fa-qrcode mr-2"></i>Mở QR Code
                    </a>
                </div>
            </div>
        `;
    }

    // Show success modal
    showSuccessModal(cardType, price, sessions, data, paymentInstructions = null) {
        const isPaymentPending = data.paymentInfo && data.paymentInfo.status === 'pending';
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 ${isPaymentPending ? 'bg-yellow-100' : 'bg-green-100'} rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i class="fas fa-${isPaymentPending ? 'clock' : 'check'} ${isPaymentPending ? 'text-yellow-600' : 'text-green-600'} text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                        ${isPaymentPending ? 'Đơn hàng đã được tạo!' : 'Mua gói thành công!'}
                    </h3>
                    <p class="text-gray-600">Cảm ơn bạn đã chọn gói ${cardType}</p>
                </div>
                
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Gói thẻ:</span>
                        <span class="font-semibold">${cardType}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Giá:</span>
                        <span class="font-semibold text-green-600">${this.formatCurrency(price)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Lượt tư vấn:</span>
                        <span class="font-semibold">${sessions} lượt/2 năm</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">VCA Token:</span>
                        <span class="font-semibold text-blue-600">${data.padTokenEarned || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Trạng thái thẻ:</span>
                        <span class="font-semibold ${data.card.status === 'active' ? 'text-green-600' : 'text-yellow-600'}">${data.card.status}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Thanh toán:</span>
                        <span class="font-semibold ${data.paymentInfo.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">${data.paymentInfo.status}</span>
                    </div>
                </div>
                
                ${isPaymentPending && paymentInstructions ? this.getPaymentInstructionsHTML(paymentInstructions) : ''}
                
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <p class="text-sm text-gray-600 text-center">
                        <i class="fas fa-envelope mr-2"></i>
                        Thông tin chi tiết đã được gửi đến email của bạn
                    </p>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300">
                        Đóng
                    </button>
                    <button onclick="window.location.reload()" 
                            class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                        Trang chủ
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Setup FAQ toggle
    setupFaqToggle() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            if (question && answer) {
                question.addEventListener('click', () => {
                    // Close other FAQ items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            const otherAnswer = otherItem.querySelector('.faq-answer');
                            const otherIcon = otherItem.querySelector('.faq-icon');
                            if (otherAnswer && otherIcon) {
                                otherAnswer.classList.add('hidden');
                                otherIcon.classList.remove('fa-chevron-down');
                                otherIcon.classList.add('fa-chevron-right');
                            }
                        }
                    });
                    
                    // Toggle current item
                    answer.classList.toggle('hidden');
                    const icon = item.querySelector('.faq-icon');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-right');
                    }
                });
            }
        });
    }

    // Populate card types (for card tiers section)
    populateCardTypes() {
        const cardTiersContainer = document.getElementById('card-tiers-section');
        if (!cardTiersContainer) return;

        const cardTypes = [
            { name: 'Standard', price: 12000000, sessions: 12, description: 'Thẻ cơ bản với 12 lượt tư vấn' },
            { name: 'Silver', price: 15000000, sessions: 15, description: 'Thẻ bạc với 15 lượt tư vấn' },
            { name: 'Gold', price: 18000000, sessions: 18, description: 'Thẻ vàng với 18 lượt tư vấn' },
            { name: 'Platinum', price: 21000000, sessions: 21, description: 'Thẻ bạch kim với 21 lượt tư vấn' },
            { name: 'Diamond', price: 24000000, sessions: 24, description: 'Thẻ kim cương với 24 lượt tư vấn' }
        ];

        const cardsHtml = cardTypes.map(card => `
            <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-id-card text-white text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">${card.name}</h3>
                <p class="text-3xl font-bold text-blue-600 mb-2">${(card.price / 1000000).toFixed(0)}M VNĐ</p>
                <p class="text-gray-600 mb-4">${card.sessions} lượt tư vấn/2 năm</p>
                <p class="text-sm text-gray-500 mb-6">${card.description}</p>
                <button onclick="openCardModal()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">
                    Mở thẻ
                </button>
            </div>
        `).join('');

        cardTiersContainer.innerHTML = cardsHtml;
    }

    // Populate card options (legacy method)
    populateCardOptions() {
        const cardOptionsContainer = document.getElementById('cardOptions');
        if (!cardOptionsContainer) return;

        const cardTypes = [
            { name: 'Standard', price: 12000000, sessions: 12 },
            { name: 'Silver', price: 15000000, sessions: 15 },
            { name: 'Gold', price: 18000000, sessions: 18 },
            { name: 'Platinum', price: 21000000, sessions: 21 },
            { name: 'Diamond', price: 24000000, sessions: 24 }
        ];

        const optionsHtml = cardTypes.map(card => `
            <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition duration-300" onclick="selectCard('${card.name}')">
                <h3 class="font-semibold text-gray-900">${card.name}</h3>
                <p class="text-blue-600 font-bold">${(card.price / 1000000).toFixed(0)}M VNĐ</p>
                <p class="text-sm text-gray-600">${card.sessions} lượt tư vấn</p>
            </div>
        `).join('');

        cardOptionsContainer.innerHTML = optionsHtml;
    }
}

// Global functions for backward compatibility
function openRegisterModal() {
    if (window.homepageManager) {
        window.homepageManager.openRegisterModal();
    }
}

function closeRegisterModal() {
    if (window.homepageManager) {
        window.homepageManager.closeRegisterModal();
    }
}

// Legacy support
function openCardModal() {
    if (window.homepageManager) {
        window.homepageManager.openCardModal();
    }
}

function closeCardModal() {
    if (window.homepageManager) {
        window.homepageManager.closeCardModal();
    }
}

function selectCard(cardName) {
    if (window.homepageManager) {
        window.homepageManager.selectedCard = cardName;
        window.homepageManager.updateBenefitsDisplay();
    }
}

function openCardNow() {
    if (window.homepageManager) {
        window.homepageManager.submitRegistration();
    }
}

function learnMore() {
    // Scroll to card tiers section
    const cardTiersSection = document.getElementById('card-tiers-section');
    if (cardTiersSection) {
        cardTiersSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Card selection functions
function openCardSelection() {
    if (window.homepageManager) {
        window.homepageManager.openCardSelection();
    }
}

function closeCardSelection() {
    if (window.homepageManager) {
        window.homepageManager.closeCardSelection();
    }
}

function goToRegistration() {
    if (window.homepageManager) {
        window.homepageManager.goToRegistration();
    }
}

function buyCardPackage(cardType, price, sessions) {
    if (window.homepageManager) {
        window.homepageManager.buyCardPackage(cardType, price, sessions);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homepageManager = new HomepageManager();
});
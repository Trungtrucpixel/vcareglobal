// PAD Token Integration JavaScript
// Tích hợp PAD Token vào các luồng góp vốn, mua thẻ, và KPI

class PadTokenIntegration {
    constructor() {
        this.apiBase = '/api';
        this.padTokenRate = 100; // 100 PAD = 1 triệu VNĐ
        this.padTokenValue = 10000; // 1 PAD = 10,000 VNĐ
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserPadToken();
    }

    setupEventListeners() {
        // Investment form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-investment-form]')) {
                this.handleInvestmentSubmission(e);
            }
        });

        // Card purchase form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-card-purchase-form]')) {
                this.handleCardPurchaseSubmission(e);
            }
        });

        // KPI form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-kpi-form]')) {
                this.handleKpiSubmission(e);
            }
        });

        // Real-time PAD Token updates
        this.setupRealTimeUpdates();
    }

    // Calculate PAD Token from VNĐ amount
    calculatePadTokenFromAmount(amount) {
        return (amount / 1000000) * this.padTokenRate;
    }

    // Calculate VNĐ amount from PAD Token
    calculateAmountFromPadToken(padToken) {
        return padToken * this.padTokenValue;
    }

    // Format PAD Token display
    formatPadToken(padToken) {
        return {
            amount: padToken.toLocaleString(),
            value: this.calculateAmountFromPadToken(padToken).toLocaleString('vi-VN'),
            display: `${padToken.toLocaleString()} PAD (${this.calculateAmountFromPadToken(padToken).toLocaleString('vi-VN')} VNĐ)`
        };
    }

    // Load user's current PAD Token
    async loadUserPadToken() {
        try {
            const response = await fetch(`${this.apiBase}/user`);
            if (response.ok) {
                const user = await response.json();
                this.updatePadTokenDisplay(user.padToken || 0);
                this.updatePadTokenCalculations();
            }
        } catch (error) {
            console.error('Error loading PAD Token:', error);
        }
    }

    // Update PAD Token display across the app
    updatePadTokenDisplay(padToken) {
        const elements = document.querySelectorAll('[data-pad-token-amount]');
        elements.forEach(element => {
            element.textContent = this.formatPadToken(padToken).amount;
        });

        const valueElements = document.querySelectorAll('[data-pad-token-value]');
        valueElements.forEach(element => {
            element.textContent = this.formatPadToken(padToken).value;
        });

        const displayElements = document.querySelectorAll('[data-pad-token-display]');
        displayElements.forEach(element => {
            element.textContent = this.formatPadToken(padToken).display;
        });
    }

    // Update PAD Token calculations in forms
    updatePadTokenCalculations() {
        // Investment amount input
        const investmentInputs = document.querySelectorAll('[data-investment-amount]');
        investmentInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const amount = parseFloat(e.target.value) || 0;
                const padToken = this.calculatePadTokenFromAmount(amount);
                this.updatePadTokenPreview(e.target, padToken);
            });
        });

        // Card price input
        const cardPriceInputs = document.querySelectorAll('[data-card-price]');
        cardPriceInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const price = parseFloat(e.target.value) || 0;
                const padToken = this.calculatePadTokenFromAmount(price);
                this.updatePadTokenPreview(e.target, padToken);
            });
        });
    }

    // Update PAD Token preview in forms
    updatePadTokenPreview(input, padToken) {
        let previewElement = input.parentNode.querySelector('[data-pad-token-preview]');
        if (!previewElement) {
            previewElement = document.createElement('div');
            previewElement.className = 'pad-token-preview';
            previewElement.setAttribute('data-pad-token-preview', '');
            previewElement.style.cssText = `
                margin-top: 0.5rem;
                padding: 0.5rem;
                background-color: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 6px;
                font-size: 0.9rem;
                color: #0369a1;
            `;
            input.parentNode.appendChild(previewElement);
        }

        if (padToken > 0) {
            previewElement.innerHTML = `
                <strong>PAD Token sẽ nhận được:</strong> ${this.formatPadToken(padToken).display}
            `;
            previewElement.style.display = 'block';
        } else {
            previewElement.style.display = 'none';
        }
    }

    // Handle investment submission
    async handleInvestmentSubmission(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const amount = parseFloat(formData.get('amount'));
        
        if (amount > 0) {
            const padToken = this.calculatePadTokenFromAmount(amount);
            this.showPadTokenNotification(padToken, 'Đầu tư');
        }
    }

    // Handle card purchase submission
    async handleCardPurchaseSubmission(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const price = parseFloat(formData.get('price'));
        
        if (price > 0) {
            const padToken = this.calculatePadTokenFromAmount(price);
            this.showPadTokenNotification(padToken, 'Mua thẻ');
        }
    }

    // Handle KPI submission
    async handleKpiSubmission(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const kpiPoints = parseFloat(formData.get('kpiPoints'));
        
        if (kpiPoints > 0) {
            // 1 KPI point = 10 PAD Token
            const padToken = kpiPoints * 10;
            this.showPadTokenNotification(padToken, 'KPI');
        }
    }

    // Show PAD Token notification
    showPadTokenNotification(padToken, action) {
        const notification = document.createElement('div');
        notification.className = 'pad-token-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">🎉</span>
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">
                        ${action} thành công!
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">
                        Bạn nhận được: ${this.formatPadToken(padToken).display}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }

    // Setup real-time PAD Token updates
    setupRealTimeUpdates() {
        // Poll for PAD Token updates every 30 seconds
        setInterval(() => {
            this.loadUserPadToken();
        }, 30000);

        // Listen for PAD Token updates from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'padTokenUpdate') {
                const padToken = JSON.parse(e.newValue);
                this.updatePadTokenDisplay(padToken);
            }
        });
    }

    // Update PAD Token after transaction
    async updatePadTokenAfterTransaction(transactionType, amount) {
        try {
            const response = await fetch(`${this.apiBase}/user`);
            if (response.ok) {
                const user = await response.json();
                this.updatePadTokenDisplay(user.padToken || 0);
                
                // Store update for other tabs
                localStorage.setItem('padTokenUpdate', JSON.stringify(user.padToken || 0));
            }
        } catch (error) {
            console.error('Error updating PAD Token:', error);
        }
    }

    // Get PAD Token history
    async getPadTokenHistory() {
        try {
            const response = await fetch(`${this.apiBase}/pad-token/history`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error loading PAD Token history:', error);
        }
        return [];
    }

    // Display PAD Token history
    async displayPadTokenHistory() {
        const history = await this.getPadTokenHistory();
        const historyContainer = document.getElementById('padTokenHistory');
        
        if (!historyContainer) return;

        historyContainer.innerHTML = history.map(record => `
            <div class="pad-token-history-item" style="
                padding: 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                background: white;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; color: #374151;">
                        ${record.changeType === 'admin_update' ? 'Cập nhật bởi Admin' : 
                          record.changeType === 'kpi_reward' ? 'Thưởng KPI' :
                          record.changeType === 'investment' ? 'Đầu tư' :
                          record.changeType === 'card_purchase' ? 'Mua thẻ' : record.changeType}
                    </span>
                    <span style="color: #6b7280; font-size: 0.9rem;">
                        ${new Date(record.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${record.changeAmount > 0 ? '#059669' : '#dc2626'}; font-weight: 600;">
                        ${record.changeAmount > 0 ? '+' : ''}${this.formatPadToken(Math.abs(record.changeAmount)).amount} PAD
                    </span>
                    <span style="color: #6b7280; font-size: 0.9rem;">
                        ${record.reason || 'Không có lý do'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Calculate ROI projection
    calculateRoiProjection(initialInvestment, padToken) {
        const projections = {
            sixMonths: padToken * 1.2, // 20% increase
            oneYear: padToken * 1.5,   // 50% increase
            threeYears: padToken * 2.5, // 150% increase
            fiveYears: padToken * 4.0   // 300% increase
        };

        return {
            initial: padToken,
            projections: projections,
            roi: {
                sixMonths: ((projections.sixMonths - padToken) / padToken) * 100,
                oneYear: ((projections.oneYear - padToken) / padToken) * 100,
                threeYears: ((projections.threeYears - padToken) / padToken) * 100,
                fiveYears: ((projections.fiveYears - padToken) / padToken) * 100
            }
        };
    }

    // Display ROI projection
    displayRoiProjection(padToken) {
        const projection = this.calculateRoiProjection(0, padToken);
        const roiContainer = document.getElementById('roiProjection');
        
        if (!roiContainer) return;

        roiContainer.innerHTML = `
            <div class="roi-projection" style="
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                padding: 1.5rem;
                border-radius: 12px;
                border: 1px solid #0ea5e9;
            ">
                <h3 style="margin-bottom: 1rem; color: #0369a1;">Dự báo ROI PAD Token</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="roi-item">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">6 tháng</div>
                        <div style="font-weight: 600; color: #0369a1;">
                            ${this.formatPadToken(projection.projections.sixMonths).display}
                        </div>
                        <div style="font-size: 0.8rem; color: #059669;">
                            ROI: +${projection.roi.sixMonths.toFixed(1)}%
                        </div>
                    </div>
                    <div class="roi-item">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">1 năm</div>
                        <div style="font-weight: 600; color: #0369a1;">
                            ${this.formatPadToken(projection.projections.oneYear).display}
                        </div>
                        <div style="font-size: 0.8rem; color: #059669;">
                            ROI: +${projection.roi.oneYear.toFixed(1)}%
                        </div>
                    </div>
                    <div class="roi-item">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">3 năm</div>
                        <div style="font-weight: 600; color: #0369a1;">
                            ${this.formatPadToken(projection.projections.threeYears).display}
                        </div>
                        <div style="font-size: 0.8rem; color: #059669;">
                            ROI: +${projection.roi.threeYears.toFixed(1)}%
                        </div>
                    </div>
                    <div class="roi-item">
                        <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">5 năm</div>
                        <div style="font-weight: 600; color: #0369a1;">
                            ${this.formatPadToken(projection.projections.fiveYears).display}
                        </div>
                        <div style="font-size: 0.8rem; color: #059669;">
                            ROI: +${projection.roi.fiveYears.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .pad-token-preview {
        transition: all 0.3s ease;
    }

    .pad-token-notification {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.padTokenIntegration = new PadTokenIntegration();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PadTokenIntegration;
}

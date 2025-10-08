// Admin Reports JavaScript
// Hỗ trợ xuất báo cáo PDF/Excel cho PAD Token và quyền lợi

class AdminReports {
    constructor() {
        this.apiBase = '/api/admin/reports';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadReportTypes();
    }

    setupEventListeners() {
        // Export button click handler
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-export-report]')) {
                this.handleExportReport(e.target);
            }
        });

        // Report type change handler
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-report-type]')) {
                this.handleReportTypeChange(e.target.value);
            }
        });
    }

    loadReportTypes() {
        const reportTypes = [
            { value: 'finance', label: 'Báo cáo Tài chính', description: 'Báo cáo tổng quan tài chính' },
            { value: 'tax', label: 'Báo cáo Thuế', description: 'Báo cáo thuế và khấu trừ' },
            { value: 'transactions', label: 'Báo cáo Giao dịch', description: 'Báo cáo chi tiết giao dịch' },
            { value: 'users', label: 'Báo cáo Người dùng', description: 'Báo cáo danh sách người dùng' },
            { value: 'pad_token_benefits', label: 'Báo cáo PAD Token & Quyền lợi', description: 'Báo cáo PAD Token và quyền lợi theo vai trò' },
            { value: 'roles_permissions', label: 'Báo cáo Vai trò & Quyền hạn', description: 'Báo cáo phân quyền và vai trò' }
        ];

        // Populate report type select if exists
        const reportTypeSelect = document.querySelector('[data-report-type]');
        if (reportTypeSelect) {
            reportTypeSelect.innerHTML = reportTypes.map(type => 
                `<option value="${type.value}">${type.label}</option>`
            ).join('');
        }
    }

    async handleExportReport(button) {
        const reportType = button.dataset.reportType || 'users';
        const format = button.dataset.format || 'pdf';
        const dateFrom = button.dataset.dateFrom || '';
        const dateTo = button.dataset.dateTo || '';

        try {
            button.disabled = true;
            button.textContent = 'Đang xuất...';

            const data = await this.exportReport(reportType, format, dateFrom, dateTo);
            
            if (format === 'pdf') {
                this.generatePDF(data, reportType);
            } else {
                this.generateCSV(data, reportType);
            }

            this.showSuccess('Xuất báo cáo thành công!');
        } catch (error) {
            this.showError('Lỗi khi xuất báo cáo: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Xuất báo cáo';
        }
    }

    async exportReport(reportType, format = 'pdf', dateFrom = '', dateTo = '') {
        let endpoint = this.apiBase + '/export';
        
        // Use specific endpoints for new report types
        if (reportType === 'pad_token_benefits') {
            endpoint = this.apiBase + '/pad-token-benefits';
        } else if (reportType === 'roles_permissions') {
            endpoint = this.apiBase + '/roles-permissions';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportType,
                format,
                dateFrom,
                dateTo
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    generatePDF(data, reportType) {
        // Import jsPDF dynamically
        import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
            .then(module => {
                const { jsPDF } = module;
                this.createPDF(data, reportType, jsPDF);
            })
            .catch(error => {
                console.error('Error loading jsPDF:', error);
                this.showError('Không thể tải thư viện PDF');
            });
    }

    createPDF(data, reportType, jsPDF) {
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
        doc.text(`Báo cáo ${this.getReportTitle(reportType)}`, pageWidth / 2, 25, { align: 'center' });
        
        // Reset color for content
        doc.setTextColor(0, 0, 0);
        
        // Date info
        doc.setFontSize(10);
        doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, 20, 45);
        
        // Summary section
        let yPos = 60;
        doc.setFontSize(12);
        doc.text(`Tổng số bản ghi: ${data.length}`, 20, yPos);
        yPos += 15;
        
        // Add separator line
        doc.setDrawColor(67, 176, 165);
        doc.setLineWidth(0.5);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 15;
        
        // Table data
        doc.setFontSize(9);
        
        if (data.length === 0) {
            doc.text('Không có dữ liệu để hiển thị', 20, yPos);
        } else {
            data.slice(0, 100).forEach((item, index) => {
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = 20;
                }
                
                const line = this.formatReportLine(item, reportType, index);
                doc.text(line, 20, yPos);
                yPos += 7;
            });
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Được tạo bởi hệ thống Phúc An Đường vào ${new Date().toLocaleString('vi-VN')}`, 20, pageHeight - 5);
        
        // Save file
        const fileName = `phuc-an-duong-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }

    formatReportLine(item, reportType, index) {
        switch (reportType) {
            case 'users':
                return `${index + 1}. ${item.name || 'N/A'} - ${item.email || 'N/A'} - ${item.role || 'N/A'}`;
            case 'transactions':
                return `${index + 1}. ${this.formatDate(item.date || new Date())} - ${item.type || 'N/A'} - ${this.formatCurrency(item.amount || 0)}`;
            case 'pad_token_benefits':
                return `${index + 1}. ${item.name || 'N/A'} - PAD: ${item.padToken || 0} - Vai trò: ${item.role || 'N/A'} - Lợi ích: ${this.formatCurrency(item.benefits?.padTokenValue || 0)}`;
            case 'roles_permissions':
                return `${index + 1}. ${item.displayName || 'N/A'} - Số người dùng: ${item.userCount || 0} - Quyền: ${(item.permissions || []).join(', ')}`;
            default:
                const displayText = typeof item === 'object' 
                    ? Object.values(item).slice(0, 3).join(' - ')
                    : String(item);
                return `${index + 1}. ${displayText.substring(0, 80)}${displayText.length > 80 ? '...' : ''}`;
        }
    }

    generateCSV(data, reportType) {
        if (data.length === 0) {
            this.showError('Không có dữ liệu để xuất');
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
    }

    getReportTitle(type) {
        const titles = {
            'finance': 'Tài chính',
            'tax': 'Thuế',
            'transactions': 'Giao dịch',
            'users': 'Người dùng',
            'pad_token_benefits': 'PAD Token & Quyền lợi',
            'roles_permissions': 'Vai trò & Quyền hạn'
        };
        return titles[type] || type;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('vi-VN');
    }

    formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('vi-VN') + ' VND';
    }

    handleReportTypeChange(reportType) {
        // Update form fields based on report type
        const dateFields = document.querySelectorAll('[data-date-field]');
        const isDateRequired = ['finance', 'tax', 'transactions', 'pad_token_benefits'].includes(reportType);
        
        dateFields.forEach(field => {
            field.style.display = isDateRequired ? 'block' : 'none';
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#059669';
        } else {
            notification.style.backgroundColor = '#dc2626';
        }

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminReports = new AdminReports();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminReports;
}

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  BarChart3,
  ShoppingBag,
  TrendingUp,
  Package,
  Download,
  Printer,
  X,
  Check,
  Eye,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';

export type ReportType = 'executive' | 'sales' | 'orders' | 'inventory';
export type ReportPeriod = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'all';
export type ReportFormat = 'csv' | 'pdf' | 'json';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

const periodLabels: Record<ReportPeriod, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days (Month)',
  '90d': 'Last 90 Days (Quarter)',
  ytd: 'Year to Date (2026)',
  all: 'All Time Records',
};

const reportTypeInfo: Record<
  ReportType,
  { title: string; subtitle: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  executive: {
    title: 'Executive Store Summary',
    subtitle: 'Comprehensive KPI overview, revenue, customer growth & order distribution',
    icon: TrendingUp,
  },
  sales: {
    title: 'Sales & Revenue Analysis',
    subtitle: 'Detailed revenue figures, category share, payment channels, and net sales',
    icon: BarChart3,
  },
  orders: {
    title: 'Orders & Fulfillment Log',
    subtitle: 'Customer purchase histories, delivery statuses, payment verification & order items',
    icon: ShoppingBag,
  },
  inventory: {
    title: 'Inventory & Stock Status',
    subtitle: 'Product SKUs, stock levels, low-stock warnings, and inventory valuations',
    icon: Package,
  },
};

function toCsvString(rows: (string | number)[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\r\n')
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function GenerateReportModal({
  isOpen,
  onClose,
  onSuccessToast,
}: GenerateReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [period, setPeriod] = useState<ReportPeriod>('30d');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);

      if (format === 'pdf') {
        setShowPrintPreview(true);
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      if (format === 'csv') {
        let rows: (string | number)[][] = [];
        let filename = `Chormokar_${reportType}_report_${period}_${dateStr}.csv`;

        if (reportType === 'executive' || reportType === 'sales') {
          rows = [
            ['Chormokar E-Commerce - Performance & Sales Report'],
            ['Reporting Period', periodLabels[period], 'Generated At', now],
            ['Currency', 'BDT (৳)'],
            [],
            ['EXECUTIVE KEY PERFORMANCE INDICATORS'],
            ['Metric', 'Value', 'Growth vs Previous Period'],
            ['Total Revenue', '৳124,563.00', '+12.5%'],
            ['Total Orders', '1,452', '+8.2%'],
            ['Average Order Value', '৳85.79', '+4.0%'],
            ['Active Users', '8,345', '-2.4%'],
            ['Conversion Rate', '3.42%', '+1.1%'],
            [],
            ['REVENUE BY PRODUCT CATEGORY'],
            ['Category', 'Orders Count', 'Gross Revenue (BDT)', 'Share (%)'],
            ['Laptops & Computers', '420', '৳58,240.00', '46.8%'],
            ['Smartphones & Tablets', '510', '৳36,410.00', '29.2%'],
            ['Audio & Accessories', '340', '৳18,650.00', '15.0%'],
            ['Gaming & Peripherals', '182', '৳11,263.00', '9.0%'],
            [],
            ['PAYMENT METHOD BREAKDOWN'],
            ['Payment Method', 'Transactions', 'Total Processed (BDT)', 'Success Rate'],
            ['bKash Payment Gateway', '697', '৳59,790.00', '98.4%'],
            ['Nagad Direct Pay', '348', '৳29,895.00', '97.6%'],
            ['Credit / Debit Card (SSLCommerz)', '261', '৳22,421.00', '96.2%'],
            ['Cash on Delivery (COD)', '146', '৳12,457.00', '92.0%'],
            [],
            ['RECENT ORDERS RECORDED'],
            ['Order ID', 'Customer Name', 'Date', 'Amount (BDT)', 'Status', 'Payment'],
            ['#ORD-4932', 'Jane Cooper', 'Oct 10, 2026', '৳1,299.00', 'Delivered', 'Paid'],
            ['#ORD-4931', 'Wade Warren', 'Oct 10, 2026', '৳49.99', 'Processing', 'Paid'],
            ['#ORD-4930', 'Esther Howard', 'Oct 09, 2026', '৳3,499.00', 'Cancelled', 'Refunded'],
            ['#ORD-4929', 'Alice Johnson', 'Oct 09, 2026', '৳850.00', 'Delivered', 'Paid'],
            ['#ORD-4928', 'Robert Smith', 'Oct 08, 2026', '৳2,150.00', 'Shipped', 'Paid'],
            ['#ORD-4927', 'Michael Chen', 'Oct 08, 2026', '৳4,590.00', 'Delivered', 'Paid'],
            ['#ORD-4926', 'Emma Watson', 'Oct 07, 2026', '৳320.00', 'Delivered', 'Paid'],
          ];
        } else if (reportType === 'orders') {
          filename = `Chormokar_Orders_Log_${period}_${dateStr}.csv`;
          rows = [
            ['Chormokar E-Commerce - Orders & Fulfillment Log'],
            ['Reporting Period', periodLabels[period], 'Generated At', now],
            ['Currency', 'BDT (৳)'],
            [],
            ['Order ID', 'Customer Name', 'Email', 'Date', 'Items Count', 'Total (BDT)', 'Status', 'Payment Method'],
            ['#ORD-4932', 'Jane Cooper', 'jane.c@example.com', 'Oct 10, 2026', '2', '৳1,299.00', 'Delivered', 'bKash'],
            ['#ORD-4931', 'Wade Warren', 'wade.w@example.com', 'Oct 10, 2026', '1', '৳49.99', 'Processing', 'Nagad'],
            ['#ORD-4930', 'Esther Howard', 'esther.h@example.com', 'Oct 09, 2026', '3', '৳3,499.00', 'Cancelled', 'Card'],
            ['#ORD-4929', 'Alice Johnson', 'alice.j@example.com', 'Oct 09, 2026', '1', '৳850.00', 'Delivered', 'bKash'],
            ['#ORD-4928', 'Robert Smith', 'robert.s@example.com', 'Oct 08, 2026', '2', '৳2,150.00', 'Shipped', 'COD'],
            ['#ORD-4927', 'Michael Chen', 'mchen@example.com', 'Oct 08, 2026', '4', '৳4,590.00', 'Delivered', 'Card'],
            ['#ORD-4926', 'Emma Watson', 'emma.w@example.com', 'Oct 07, 2026', '1', '৳320.00', 'Delivered', 'bKash'],
            ['#ORD-4925', 'James Wilson', 'jwilson@example.com', 'Oct 07, 2026', '2', '৳1,450.00', 'Delivered', 'Nagad'],
            ['#ORD-4924', 'Sarah Miller', 'smiller@example.com', 'Oct 06, 2026', '1', '৳99.00', 'Delivered', 'bKash'],
          ];
        } else if (reportType === 'inventory') {
          filename = `Chormokar_Inventory_Stock_${dateStr}.csv`;
          rows = [
            ['Chormokar E-Commerce - Inventory & Stock Valuation Report'],
            ['Generated At', now, 'Warehouse', 'Central Hub (Dhaka)'],
            ['Total Catalog Items', '148', 'Total Valuation', '৳2,840,500.00'],
            [],
            ['Product Name', 'SKU', 'Category', 'Unit Price (BDT)', 'Current Stock', 'Stock Status'],
            ['MacBook Pro 16" M3 Max', 'APL-MBP-16M3', 'Laptops & Computers', '৳395,000.00', '14', 'In Stock'],
            ['Sony WH-1000XM5 Wireless Headphones', 'SNY-WH1000-XM5', 'Audio & Accessories', '৳42,500.00', '28', 'In Stock'],
            ['Apple iPhone 16 Pro Max 256GB', 'APL-IP16-PM', 'Smartphones & Tablets', '৳189,000.00', '6', 'Low Stock'],
            ['Logitech MX Master 3S Mouse', 'LOG-MXM-3S', 'Gaming & Peripherals', '৳12,500.00', '45', 'In Stock'],
            ['Dell UltraSharp 27" 4K Monitor', 'DEL-U2723QE', 'Laptops & Computers', '৳78,000.00', '12', 'In Stock'],
            ['Keychron Q1 Pro Mechanical Keyboard', 'KEY-Q1-PRO', 'Gaming & Peripherals', '৳24,500.00', '3', 'Low Stock'],
            ['Samsung Galaxy S24 Ultra 512GB', 'SAM-S24-ULT', 'Smartphones & Tablets', '৳165,000.00', '0', 'Out of Stock'],
          ];
        }

        downloadBlob(toCsvString(rows), filename, 'text/csv;charset=utf-8;');
        onSuccessToast(`Report downloaded as ${filename}`);
      } else if (format === 'json') {
        const filename = `Chormokar_${reportType}_${period}_${dateStr}.json`;
        const jsonData = {
          store: 'Chormokar E-Commerce',
          reportType,
          period: periodLabels[period],
          currency: 'BDT (৳)',
          generatedAt: now,
          summary: {
            totalRevenue: '৳124,563.00',
            totalOrders: 1452,
            averageOrderValue: '৳85.79',
            conversionRate: '3.42%',
            activeUsers: 8345,
          },
          categoryShare: [
            { category: 'Laptops & Computers', revenue: '৳58,240.00', share: '46.8%' },
            { category: 'Smartphones & Tablets', revenue: '৳36,410.00', share: '29.2%' },
            { category: 'Audio & Accessories', revenue: '৳18,650.00', share: '15.0%' },
            { category: 'Gaming & Peripherals', revenue: '৳11,263.00', share: '9.0%' },
          ],
          paymentBreakdown: [
            { method: 'bKash', transactions: 697, amount: '৳59,790.00' },
            { method: 'Nagad', transactions: 348, amount: '৳29,895.00' },
            { method: 'Card', transactions: 261, amount: '৳22,421.00' },
            { method: 'COD', transactions: 146, amount: '৳12,457.00' },
          ],
        };

        downloadBlob(JSON.stringify(jsonData, null, 2), filename, 'application/json');
        onSuccessToast(`Report downloaded as ${filename}`);
      }

      onClose();
    }, 600);
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isGenerating) {
            onClose();
          }
        }}
      >
        <div
          className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border-color flex items-center justify-between bg-bg-secondary/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-primary">Generate Store Report</h3>
                <p className="text-xs text-text-secondary">Export comprehensive analytics, revenue, orders, and stock records</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Section 1: Report Type */}
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2.5">
                1. Select Report Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(reportTypeInfo) as ReportType[]).map((type) => {
                  const info = reportTypeInfo[type];
                  const Icon = info.icon;
                  const isSelected = reportType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type)}
                      className={clsx(
                        'text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3 relative',
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/[0.04] ring-2 ring-accent-primary/20 shadow-xs'
                          : 'border-black/10 hover:border-black/20 hover:bg-black/[0.01]'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                          isSelected
                            ? 'bg-accent-primary text-white shadow-xs'
                            : 'bg-black/5 text-text-secondary'
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="pr-4">
                        <h4 className="font-bold text-sm text-text-primary leading-tight mb-1">
                          {info.title}
                        </h4>
                        <p className="text-[11px] text-text-secondary leading-normal line-clamp-2">
                          {info.subtitle}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-2xs">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Reporting Period */}
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2.5">
                2. Reporting Time Period
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => {
                  const isSelected = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={clsx(
                        'px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer',
                        isSelected
                          ? 'bg-accent-primary text-white border-accent-primary shadow-xs'
                          : 'bg-black/[0.02] hover:bg-black/5 text-text-secondary border-black/5'
                      )}
                    >
                      <span>{periodLabels[p]}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Export Format */}
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2.5">
                3. File Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'csv' as ReportFormat,
                    title: 'CSV Sheet',
                    desc: 'Excel & Google Sheets',
                    icon: Download,
                  },
                  {
                    id: 'pdf' as ReportFormat,
                    title: 'Printable PDF',
                    desc: 'Print & Save as PDF',
                    icon: Printer,
                  },
                  {
                    id: 'json' as ReportFormat,
                    title: 'JSON Data',
                    desc: 'Raw Data & API',
                    icon: Layers,
                  },
                ].map((fmt) => {
                  const isSelected = format === fmt.id;
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={clsx(
                        'p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5',
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/[0.04] ring-2 ring-accent-primary/20 shadow-xs'
                          : 'border-black/10 hover:border-black/20 hover:bg-black/[0.01]'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-accent-primary text-white shadow-xs'
                            : 'bg-black/5 text-text-secondary'
                        )}
                      >
                        <Icon size={16} />
                      </div>
                      <span className="font-bold text-xs text-text-primary">{fmt.title}</span>
                      <span className="text-[10px] text-text-muted">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Preview Box */}
            <div className="bg-bg-secondary/60 rounded-2xl p-4 border border-border-color flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Report Summary
                </span>
                <p className="font-semibold text-text-primary">
                  {reportTypeInfo[reportType].title} ({periodLabels[period]})
                </p>
                <p className="text-text-secondary text-[11px]">
                  All values formatted in Bangladeshi Taka (৳) • Ready for export
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-black/5 shadow-2xs font-mono font-bold text-accent-primary text-xs shrink-0">
                .{format.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-color flex items-center justify-between bg-bg-secondary/20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn btn-primary px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling Report...</span>
                </>
              ) : format === 'pdf' ? (
                <>
                  <Eye size={16} />
                  <span>Preview & Print PDF</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download .{format.toUpperCase()} Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Executive PDF Preview Modal */}
      {showPrintPreview && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPrintPreview(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Controls (Hidden when printing) */}
            <div className="px-6 py-4 border-b border-border-color flex items-center justify-between bg-bg-secondary/40 sticky top-0 z-20 backdrop-blur-sm print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-accent-primary" />
                <span className="font-bold text-sm text-text-primary">Printable Report Preview</span>
                <span className="text-xs text-text-muted font-mono">({periodLabels[period]})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Actual Printable Document Sheet */}
            <div className="p-8 sm:p-12 space-y-8 bg-white print:p-6 print:m-0">
              {/* Report Header */}
              <div className="flex items-start justify-between border-b border-black/10 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-accent-primary text-white flex items-center justify-center font-black text-sm">
                      TP
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-text-primary">CHORMOKAR</h1>
                  </div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                    Official Executive Store Performance Report
                  </p>
                </div>
                <div className="text-right text-xs text-text-secondary space-y-1">
                  <p>
                    <span className="font-bold text-text-primary">Reporting Period:</span> {periodLabels[period]}
                  </p>
                  <p>
                    <span className="font-bold text-text-primary">Generated On:</span>{' '}
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p>
                    <span className="font-bold text-text-primary">Currency:</span> Bangladeshi Taka (৳ BDT)
                  </p>
                </div>
              </div>

              {/* KPI Cards */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Core Performance Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                    <span className="text-xs text-text-muted block mb-1">Total Revenue</span>
                    <span className="text-xl font-black text-text-primary block">৳124,563.00</span>
                    <span className="text-[11px] font-semibold text-success mt-1 inline-block">+12.5% vs last period</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                    <span className="text-xs text-text-muted block mb-1">Total Orders</span>
                    <span className="text-xl font-black text-text-primary block">1,452</span>
                    <span className="text-[11px] font-semibold text-success mt-1 inline-block">+8.2% vs last period</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                    <span className="text-xs text-text-muted block mb-1">Average Order Value</span>
                    <span className="text-xl font-black text-text-primary block">৳85.79</span>
                    <span className="text-[11px] font-semibold text-success mt-1 inline-block">+4.0% vs last period</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                    <span className="text-xs text-text-muted block mb-1">Conversion Rate</span>
                    <span className="text-xl font-black text-text-primary block">3.42%</span>
                    <span className="text-[11px] font-semibold text-success mt-1 inline-block">+1.1% vs last period</span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Sales Distribution by Category
                </h3>
                <div className="border border-black/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-black/[0.03] text-text-muted font-bold">
                      <tr>
                        <th className="p-3 border-b border-black/5">Category</th>
                        <th className="p-3 border-b border-black/5">Orders</th>
                        <th className="p-3 border-b border-black/5">Gross Revenue (BDT)</th>
                        <th className="p-3 border-b border-black/5 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/70">
                      <tr>
                        <td className="p-3 font-semibold text-text-primary">Laptops & Computers</td>
                        <td className="p-3 text-text-secondary">420</td>
                        <td className="p-3 font-semibold text-text-primary">৳58,240.00</td>
                        <td className="p-3 font-bold text-right text-accent-primary">46.8%</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-text-primary">Smartphones & Tablets</td>
                        <td className="p-3 text-text-secondary">510</td>
                        <td className="p-3 font-semibold text-text-primary">৳36,410.00</td>
                        <td className="p-3 font-bold text-right text-accent-primary">29.2%</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-text-primary">Audio & Accessories</td>
                        <td className="p-3 text-text-secondary">340</td>
                        <td className="p-3 font-semibold text-text-primary">৳18,650.00</td>
                        <td className="p-3 font-bold text-right text-accent-primary">15.0%</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-text-primary">Gaming & Peripherals</td>
                        <td className="p-3 text-text-secondary">182</td>
                        <td className="p-3 font-semibold text-text-primary">৳11,263.00</td>
                        <td className="p-3 font-bold text-right text-accent-primary">9.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Orders Log Table */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Recent Verified Order Transactions
                </h3>
                <div className="border border-black/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-black/[0.03] text-text-muted font-bold">
                      <tr>
                        <th className="p-3 border-b border-black/5">Order ID</th>
                        <th className="p-3 border-b border-black/5">Customer</th>
                        <th className="p-3 border-b border-black/5">Date</th>
                        <th className="p-3 border-b border-black/5">Amount (BDT)</th>
                        <th className="p-3 border-b border-black/5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/70">
                      {[
                        { id: '#ORD-4932', customer: 'Jane Cooper', date: 'Oct 10, 2026', amount: '৳1,299.00', status: 'Delivered' },
                        { id: '#ORD-4931', customer: 'Wade Warren', date: 'Oct 10, 2026', amount: '৳49.99', status: 'Processing' },
                        { id: '#ORD-4930', customer: 'Esther Howard', date: 'Oct 09, 2026', amount: '৳3,499.00', status: 'Cancelled' },
                        { id: '#ORD-4929', customer: 'Alice Johnson', date: 'Oct 09, 2026', amount: '৳850.00', status: 'Delivered' },
                        { id: '#ORD-4928', customer: 'Robert Smith', date: 'Oct 08, 2026', amount: '৳2,150.00', status: 'Shipped' },
                      ].map((ord) => (
                        <tr key={ord.id}>
                          <td className="p-3 font-mono font-bold text-text-primary">{ord.id}</td>
                          <td className="p-3 text-text-secondary">{ord.customer}</td>
                          <td className="p-3 text-text-muted">{ord.date}</td>
                          <td className="p-3 font-semibold text-text-primary">{ord.amount}</td>
                          <td className="p-3 font-semibold text-right text-text-primary">{ord.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sign-off Footer */}
              <div className="pt-6 border-t border-black/10 flex items-center justify-between text-[11px] text-text-muted">
                <p>Report ID: TPR-{Date.now().toString().slice(-8)} • Verified Data</p>
                <p>© 2026 Chormokar E-Commerce System • Confidential</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

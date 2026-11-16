'use client';

import Link from 'next/link';
import { mediaUrl } from '../../../../shared/lib/media';
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  Truck, 
  Package, 
  CreditCard, 
  User, 
  MapPin, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Send, 
  Mail, 
  Phone, 
  ChevronDown,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { use, useState } from 'react';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  // Interactive state
  const [orderStatus, setOrderStatus] = useState<'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'>('Processing');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Array<{ id: number; author: string; text: string; time: string; role: string }>>([
    {
      id: 1,
      author: 'Sarah Miller',
      role: 'Fulfillment Lead',
      text: 'Verified item serial numbers (C02G901) and packaged in protective anti-static wrap.',
      time: 'Oct 10, 2026 at 3:15 PM'
    },
    {
      id: 2,
      author: 'Stripe Gateway',
      role: 'Automated Bot',
      text: 'Payment authorized and captured successfully via 3D-Secure 2.0.',
      time: 'Oct 10, 2026 at 2:46 PM'
    }
  ]);
  const [newNoteText, setNewNoteText] = useState('');

  const order = {
    id: orderId,
    date: 'Oct 10, 2026 at 2:45 PM',
    payment: 'Paid',
    subtotal: 1250.00,
    discount: 50.00,
    shippingCost: 15.00,
    tax: 84.00,
    total: 1299.00,
    trackingNumber: 'FX-9400-1092-84210',
    carrier: 'FedEx Priority Overnight',
    estimatedDelivery: 'Tuesday, Oct 13, 2026 by 4:30 PM',
    customer: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1 (555) 123-4567',
      tier: 'VIP Gold Member',
      ordersCount: 6,
      lifetimeSpent: '৳4,850.00',
    },
    shippingAddress: {
      recipient: 'Alice Johnson',
      company: 'Acme Technologies Inc.',
      line1: '123 Tech Avenue',
      line2: 'Suite 400, Floor 4',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
      instructions: 'Please leave with reception/concierge on the 4th floor.',
    },
    billingAddress: {
      recipient: 'Alice Johnson',
      company: 'Acme Technologies Inc.',
      line1: '123 Tech Avenue',
      line2: 'Suite 400, Floor 4',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
    },
    items: [
      { 
        id: 1, 
        name: 'MacBook Pro 16-inch', 
        subtitle: 'Apple M3 Max · 36GB Unified Memory · 1TB SSD Storage',
        sku: 'MBP-16-M3-SILVER', 
        variant: 'Silver / 16" / M3 Max',
        price: 1200.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80',
        inStock: true
      },
      { 
        id: 2, 
        name: 'Apple Magic Mouse', 
        subtitle: 'Wireless Bluetooth · Rechargeable · Multi-Touch Surface',
        sku: 'M-MOUSE-W', 
        variant: 'White / Standard',
        price: 50.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&q=80',
        inStock: true
      },
    ]
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = {
      id: Date.now(),
      author: 'Admin (You)',
      role: 'Store Manager',
      text: newNoteText.trim(),
      time: 'Just now'
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    showToast('Internal note added to order');
  };

  const handleStatusChange = (newStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled') => {
    setOrderStatus(newStatus);
    showToast(`Order status updated to ${newStatus}`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Delivered': 
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Delivered"
        };
      case 'Shipped': 
        return {
          bg: "bg-brand/5 text-brand border-brand/20",
          dot: "bg-brand",
          label: "Shipped"
        };
      case 'Processing': 
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500 animate-pulse",
          label: "Processing"
        };
      case 'Cancelled': 
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          label: "Cancelled"
        };
      default: 
        return {
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
          label: status
        };
    }
  };

  const statusInfo = getStatusBadge(orderStatus);

  // Stepper milestones
  const steps = [
    { label: 'Order Placed', time: 'Oct 10, 2:45 PM', completed: true },
    { label: 'Payment Confirmed', time: 'Oct 10, 2:46 PM', completed: true },
    { label: 'Order Processing', time: 'Oct 10, 3:15 PM', completed: orderStatus !== 'Cancelled' },
    { label: 'Dispatched & Shipped', time: orderStatus === 'Shipped' || orderStatus === 'Delivered' ? 'Oct 10, 4:00 PM' : 'Pending', completed: orderStatus === 'Shipped' || orderStatus === 'Delivered' },
    { label: 'Delivered', time: orderStatus === 'Delivered' ? 'Oct 12, 11:20 AM' : 'Estimated Oct 13', completed: orderStatus === 'Delivered' },
  ];

  const cardClasses = "bg-white rounded-2xl border border-black/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.05)] transition-shadow duration-200 p-6";

  return (
    <div className="animate-fade-in pb-16 max-w-[1280px] mx-auto print:max-w-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-zinc-800 animate-fade-in print:hidden">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Invoice Branding (Print Only) */}
      <div className="hidden print:block mb-8 border-b-2 border-black/10 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <img src="/images/brand/chormokar-logo.png" alt="Chormokar Logo" className="h-16 w-auto object-contain mb-2" />
            <h2 className="text-xl font-bold tracking-tight">Chormokar</h2>
            <p className="text-xs text-gray-600 mt-1">1st Floor, Rising Sun Tower, Parise Rd<br />Mirpur 10, Dhaka 1216, Bangladesh<br />chormokar@outlook.com · +880 1846-956752</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider rounded mb-2">OFFICIAL INVOICE</span>
            <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-text-primary">#{order.id}</h1>
            <p className="text-xs text-gray-500 mt-1">Issued Date: {order.date}</p>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">Status: PAID IN FULL</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs py-4 border-t border-gray-100">
          <div>
            <p className="font-bold uppercase tracking-wider text-gray-400 mb-1">BILLED TO:</p>
            <p className="font-bold text-gray-900">{order.customer.name}</p>
            <p className="text-gray-600">{order.customer.email}</p>
            <p className="text-gray-600">{order.billingAddress.line1}, {order.billingAddress.line2}</p>
            <p className="text-gray-600">{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-gray-400 mb-1">SHIPPED VIA:</p>
            <p className="font-bold text-gray-900">{order.carrier}</p>
            <p className="text-gray-600">Tracking: {order.trackingNumber}</p>
            <p className="text-gray-600">{order.shippingAddress.line1}, {order.shippingAddress.line2}</p>
            <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="print:hidden mb-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted mb-4">
          <Link href="/orders" className="hover:text-accent-primary transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Orders
          </Link>
          <span>/</span>
          <span className="text-text-primary font-semibold">#{order.id}</span>
        </div>

        {/* Title and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center font-bold text-lg border border-accent-primary/20 shrink-0">
              <Package size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-text-primary">
                  Order #{order.id}
                </h1>
                <div className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border", statusInfo.bg)}>
                  <span className={clsx("w-2 h-2 rounded-full", statusInfo.dot)} />
                  {statusInfo.label}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid
                </span>
              </div>
              <p className="text-text-secondary text-sm mt-1 flex items-center gap-2">
                <span>Placed on {order.date}</span>
                <span>•</span>
                <span className="text-text-muted">via Web Storefront</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Dropdown Selector */}
            <div className="relative group">
              <select
                aria-label="Update Order Status"
                value={orderStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="appearance-none bg-white border border-border-color hover:border-black/20 text-text-primary text-sm font-semibold pl-4 pr-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/20 cursor-pointer transition-all"
              >
                <option value="Processing">Mark Processing</option>
                <option value="Shipped">Mark Shipped</option>
                <option value="Delivered">Mark Delivered</option>
                <option value="Cancelled">Cancel Order</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-hover:text-text-primary transition-colors" />
            </div>

            <button 
              onClick={() => window.print()}
              className="btn bg-white border border-border-color hover:bg-black/[0.03] text-text-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.01]"
              title="Print official invoice"
            >
              <Printer size={16} className="text-text-secondary" /> 
              <span>Print Invoice</span>
            </button>

            <button 
              onClick={() => showToast(`Invoice resent to ${order.customer.email}`)}
              className="btn bg-white border border-border-color hover:bg-black/[0.03] text-text-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.01]"
              title="Resend email invoice"
            >
              <Mail size={16} className="text-text-secondary" />
              <span>Email Invoice</span>
            </button>

            {orderStatus !== 'Shipped' && orderStatus !== 'Delivered' && (
              <button 
                onClick={() => handleStatusChange('Shipped')}
                className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.01]"
              >
                <Truck size={16} />
                <span>Dispatch Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fulfillment Stepper (Screen Only) */}
      <div className={clsx(cardClasses, "mb-8 print:hidden")}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-accent-primary" />
            <h2 className="text-base font-bold text-text-primary">Fulfillment Journey</h2>
          </div>
          <span className="text-xs font-semibold text-text-secondary bg-black/5 px-2.5 py-1 rounded-lg">
            Carrier: <strong className="text-text-primary">{order.carrier}</strong>
          </span>
        </div>

        {/* Stepper bar */}
        <div className="relative">
          <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-gray-100 z-0" />
          <div 
            className="hidden sm:block absolute top-4 left-6 h-0.5 bg-accent-primary transition-all duration-500 z-0" 
            style={{ 
              width: orderStatus === 'Delivered' ? '100%' : orderStatus === 'Shipped' ? '75%' : '50%' 
            }} 
          />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2">
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                  step.completed 
                    ? "bg-accent-primary text-white ring-4 ring-accent-primary/10" 
                    : "bg-white border-2 border-gray-200 text-gray-400"
                )}>
                  {step.completed ? <Check size={14} strokeWidth={3} /> : idx + 1}
                </div>
                <div className="sm:text-center">
                  <p className={clsx("text-xs font-bold leading-tight", step.completed ? "text-text-primary" : "text-text-muted")}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1 print:gap-8">
        
        {/* Left Column (Items, Tracking, Notes) - 2 spans */}
        <div className="lg:col-span-2 flex flex-col gap-8 print:col-span-1 print:gap-6">
          
          {/* Tracking Banner */}
          <div className={clsx(cardClasses, "bg-gradient-to-r from-brand/5 to-white border-brand/10 print:hidden")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent-primary uppercase tracking-wide">Tracking Information</span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-base font-extrabold text-text-primary mt-0.5">{order.trackingNumber}</p>
                  <p className="text-xs text-text-secondary mt-0.5">Estimated delivery: {order.estimatedDelivery}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button 
                  onClick={() => copyToClipboard(order.trackingNumber, 'tracking', 'Tracking number')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-border-color hover:bg-black/[0.02] text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === 'tracking' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedKey === 'tracking' ? 'Copied' : 'Copy'}</span>
                </button>
                <a 
                  href="https://www.fedex.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Track Carrier</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Items Ordered Card */}
          <div className={clsx(cardClasses, "print:p-0 print:border-none print:shadow-none")}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/5">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Order Items</h2>
                <p className="text-xs text-text-secondary mt-0.5">{order.items.length} items purchased</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full print:hidden">
                All Items In Stock
              </span>
            </div>

            {/* Items List */}
            <div className="divide-y divide-border-color/70">
              {order.items.map((item) => (
                <div key={item.id} className="py-4.5 first:pt-0 last:pb-0 flex items-center gap-4 group">
                  {/* Thumbnail */}
                  <div className="w-18 h-18 rounded-xl bg-gray-50 border border-black/10 overflow-hidden shrink-0 flex items-center justify-center p-1.5 print:w-12 print:h-12">
                    <img 
                      src={mediaUrl(item.image)} 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-text-primary group-hover:text-accent-primary transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{item.subtitle}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[11px] font-mono text-text-muted bg-black/[0.03] px-2 py-0.5 rounded border border-black/5">
                            SKU: {item.sku}
                          </span>
                          <span className="text-[11px] font-semibold text-text-secondary bg-black/[0.03] px-2 py-0.5 rounded border border-black/5">
                            {item.variant}
                          </span>
                        </div>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-base text-text-primary">
                          ৳{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          ৳{item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="mt-8 pt-6 border-t border-black/5 bg-black/[0.01] -mx-6 -mb-6 p-6 rounded-b-2xl print:bg-transparent print:p-0 print:m-0 print:border-t-2">
              <div className="flex flex-col gap-2.5 w-full sm:w-80 ml-auto">
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-text-primary">৳{order.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-emerald-600">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} /> Discount (Promo: TECH10)
                  </span>
                  <span className="font-semibold">-৳{order.discount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Shipping (FedEx Overnight)</span>
                  <span className="font-semibold text-text-primary">৳{order.shippingCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Estimated Tax (CA 7.25%)</span>
                  <span className="font-semibold text-text-primary">৳{order.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-black/10 mt-1">
                  <div>
                    <span className="text-base font-extrabold text-text-primary">Total Amount</span>
                    <p className="text-[11px] text-text-muted">Includes applicable sales taxes</p>
                  </div>
                  <span className="text-2xl font-black text-text-primary tracking-tight">
                    ৳{order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Notes & Activity Log (Screen Only) */}
          <div className={clsx(cardClasses, "print:hidden")}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-accent-primary" />
                <h3 className="text-base font-bold text-text-primary">Staff Notes & Internal Audit</h3>
              </div>
              <span className="text-xs font-semibold text-text-muted">Visible to team only</span>
            </div>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="mb-6">
              <div className="relative">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add an internal note about packaging, customer requests, or special handling..."
                  rows={2}
                  className="w-full p-3.5 pr-24 text-sm bg-black/[0.01] border border-border-color rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10 transition-all resize-none text-text-primary"
                />
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="absolute right-2.5 bottom-3.5 px-3 py-1.5 bg-accent-primary hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent-primary text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Send size={12} />
                  <span>Post Note</span>
                </button>
              </div>
            </form>

            {/* Activity History */}
            <div className="flex flex-col gap-3">
              {notes.map((note) => (
                <div key={note.id} className="p-3.5 rounded-xl bg-black/[0.015] border border-black/5 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-[10px] font-bold flex items-center justify-center">
                        {note.author[0]}
                      </div>
                      <span className="font-bold text-text-primary text-xs">{note.author}</span>
                      <span className="text-[10px] font-medium text-text-muted bg-black/5 px-1.5 py-0.5 rounded">
                        {note.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted">{note.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-7">{note.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (Customer, Shipping, Payment, Security) - 1 span */}
        <div className="flex flex-col gap-6 print:col-span-1 print:gap-6">
          
          {/* Customer Card */}
          <div className={clsx(cardClasses, "print:p-0 print:border-none print:shadow-none")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={18} className="text-accent-primary" />
                <h3 className="text-base font-bold text-text-primary">Customer</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                {order.customer.tier}
              </span>
            </div>

            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-black/5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-primary to-brand text-white font-extrabold flex items-center justify-center text-base shrink-0">
                AJ
              </div>
              <div>
                <h4 className="font-bold text-text-primary text-base">{order.customer.name}</h4>
                <p className="text-xs text-text-muted">{order.customer.ordersCount} prior orders · {order.customer.lifetimeSpent} spent</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Mail size={14} className="text-text-muted shrink-0" />
                  <span className="truncate max-w-[180px]">{order.customer.email}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(order.customer.email, 'email', 'Email')}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Copy Email"
                >
                  {copiedKey === 'email' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Phone size={14} className="text-text-muted shrink-0" />
                  <span>{order.customer.phone}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(order.customer.phone, 'phone', 'Phone')}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Copy Phone"
                >
                  {copiedKey === 'phone' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className={clsx(cardClasses, "print:p-0 print:border-none print:shadow-none")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-accent-primary" />
                <h3 className="text-base font-bold text-text-primary">Shipping Address</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(`${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}`, 'address', 'Address')}
                className="text-[11px] font-semibold text-text-secondary hover:text-accent-primary flex items-center gap-1 transition-colors print:hidden"
              >
                {copiedKey === 'address' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedKey === 'address' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-xs text-text-secondary space-y-1">
              <p className="font-bold text-text-primary text-sm mb-1">{order.shippingAddress.recipient}</p>
              <p>{order.shippingAddress.company}</p>
              <p>{order.shippingAddress.line1}</p>
              <p>{order.shippingAddress.line2}</p>
              <p className="font-medium text-text-primary">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.country}</p>
            </div>

            {order.shippingAddress.instructions && (
              <div className="mt-4 pt-3.5 border-t border-black/5 flex items-start gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50 print:bg-transparent print:border-none print:p-0">
                <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  {order.shippingAddress.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Payment Card */}
          <div className={clsx(cardClasses, "print:p-0 print:border-none print:shadow-none")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-accent-primary" />
                <h3 className="text-base font-bold text-text-primary">Payment & Billing</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Captured
              </span>
            </div>

            {/* Credit Card Mini Preview */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white mb-4 print:hidden">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono tracking-widest text-zinc-400">CREDIT CARD</span>
                <span className="text-xs font-black italic tracking-wider">VISA</span>
              </div>
              <p className="font-mono text-sm tracking-widest mb-1.5">•••• •••• •••• 4242</p>
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span>Alice Johnson</span>
                <span>Exp 12/28</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Method</span>
                <span className="font-semibold text-text-primary">Visa ending in 4242</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Processor</span>
                <span className="font-semibold text-text-primary">Stripe Payments (US)</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Transaction Ref</span>
                <span className="font-mono text-[11px] text-text-primary">pi_3M4qL892401x</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Billing Address</span>
                <span className="font-medium text-text-muted">Same as shipping</span>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-black/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck size={16} />
                <span>Fraud Risk: Very Low (0.02)</span>
              </div>
              <span className="text-[10px] text-text-muted">3D-Secure 2.0</span>
            </div>
          </div>

        </div>

      </div>

      {/* Invoice Footer (Print Only) */}
      <div className="hidden print:block mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
        <p className="font-bold text-gray-700 mb-1">Thank you for your business with Chormokar!</p>
        <p>If you have any questions about this invoice, please reach out to chormokar@outlook.com.</p>
        <p className="mt-2 text-[10px] text-gray-400">Chormokar Inc. · 123 Tech Avenue, San Francisco, CA 94105 · Tax ID: US-948123049</p>
      </div>

    </div>
  );
}

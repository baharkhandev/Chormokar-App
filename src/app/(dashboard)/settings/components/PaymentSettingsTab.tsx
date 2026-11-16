'use client';

import { CheckoutRulesCard, type CheckoutRules } from './CheckoutRulesCard';

export interface PaymentSettingsTabProps {
  embedded?: boolean;
  initialCheckoutRules?: CheckoutRules | null;
}

export function PaymentSettingsTab({
  embedded = false,
  initialCheckoutRules = null,
}: PaymentSettingsTabProps) {
  return (
    <div className={embedded ? '' : 'space-y-8 animate-fade-in'}>
      <div
        className={
          embedded
            ? ''
            : 'bg-white rounded-2xl border border-black/5 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
        }
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-1">Payment Method</h2>
          <p className="text-xs text-text-secondary">
            Chormokar takes cash on delivery only. There is no online payment gateway.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-black/5 bg-black/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
              <span className="font-black text-2xl leading-none">৳</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Cash on Delivery (COD)</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Customers pay the full amount in cash when the courier delivers the parcel
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
                No transaction fees · Offline settlement
              </span>
            </div>
          </div>

          <span className="self-end sm:self-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Always on
          </span>
        </div>

        <div className="mt-6 border-t border-border-color pt-6">
          <CheckoutRulesCard embedded initial={initialCheckoutRules} />
        </div>
      </div>
    </div>
  );
}

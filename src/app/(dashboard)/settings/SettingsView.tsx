'use client';

import { PaymentSettingsTab } from './components/PaymentSettingsTab';
import type { CheckoutRules } from './components/CheckoutRulesCard';
import {
  AISettingsSection,
  type AISettings,
  type ProviderPreset,
} from './components/AISettingsSection';

export function SettingsView({
  initialAISettings,
  initialCheckoutRules,
  initialProviders,
}: {
  initialAISettings: AISettings | null;
  initialCheckoutRules: CheckoutRules | null;
  initialProviders: ProviderPreset[] | null;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-black/5 bg-white p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <AISettingsSection
          initial={initialAISettings}
          initialPresets={initialProviders}
        />

        <div className="my-8 border-t border-border-color" />

        <PaymentSettingsTab
          embedded
          initialCheckoutRules={initialCheckoutRules}
        />
      </div>
    </div>
  );
}

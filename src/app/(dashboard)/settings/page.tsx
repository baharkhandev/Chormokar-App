import { serverApiGet } from '../../../shared/api/serverApi';
import { SettingsView } from './SettingsView';
import type { AISettings, ProviderPreset } from './components/AISettingsSection';
import type { CheckoutRules } from './components/CheckoutRulesCard';

export default async function SettingsPage() {
  // Render both sections with real values on first paint so nothing pops in.
  const [initialAISettings, initialCheckoutRules, initialProviders] =
    await Promise.all([
      serverApiGet<AISettings>('/admin/ai/settings/'),
      serverApiGet<CheckoutRules>('/admin/settings/checkout/'),
      serverApiGet<ProviderPreset[]>('/admin/ai/providers/'),
    ]);

  return (
    <SettingsView
      initialAISettings={initialAISettings}
      initialCheckoutRules={initialCheckoutRules}
      initialProviders={initialProviders}
    />
  );
}

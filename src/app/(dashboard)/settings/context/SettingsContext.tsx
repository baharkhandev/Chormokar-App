'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export interface ToastInfo {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface SettingsContextType {
  // General Settings
  storeName: string;
  setStoreName: (val: string) => void;
  storeTagline: string;
  setStoreTagline: (val: string) => void;
  supportEmail: string;
  setSupportEmail: (val: string) => void;
  supportPhone: string;
  setSupportPhone: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;

  // Payment Settings
  autoGenerateInvoice: boolean;
  setAutoGenerateInvoice: (val: boolean) => void;
  requirePhoneAtCheckout: boolean;
  setRequirePhoneAtCheckout: (val: boolean) => void;

  // Shipping Settings
  freeShippingThreshold: string;
  setFreeShippingThreshold: (val: string) => void;
  flatRateShipping: string;
  setFlatRateShipping: (val: string) => void;
  pathaoEnabled: boolean;
  setPathaoEnabled: (val: boolean) => void;
  steadfastEnabled: boolean;
  setSteadfastEnabled: (val: boolean) => void;
  pathaoEnv: 'sandbox' | 'production';
  setPathaoEnv: (val: 'sandbox' | 'production') => void;
  pathaoClientId: string;
  setPathaoClientId: (val: string) => void;
  pathaoClientSecret: string;
  setPathaoClientSecret: (val: string) => void;
  pathaoUsername: string;
  setPathaoUsername: (val: string) => void;
  pathaoPassword: string;
  setPathaoPassword: (val: string) => void;
  pathaoStoreId: string;
  setPathaoStoreId: (val: string) => void;
  steadfastApiKey: string;
  setSteadfastApiKey: (val: string) => void;
  steadfastSecretKey: string;
  setSteadfastSecretKey: (val: string) => void;

  // Notification Settings
  notifyNewOrder: boolean;
  setNotifyNewOrder: (val: boolean) => void;
  notifyLowStock: boolean;
  setNotifyLowStock: (val: boolean) => void;
  notifyRefund: boolean;
  setNotifyRefund: (val: boolean) => void;

  // Security Settings
  twoFactorAuth: boolean;
  setTwoFactorAuth: (val: boolean) => void;
  sessionTimeout: string;
  setSessionTimeout: (val: string) => void;

  // Global Actions & UI Meta
  isSaving: boolean;
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
  handleFieldChange: () => void;
  handleSave: () => void;
  handleDiscard: () => void;
  toast: ToastInfo | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // General Settings State
  const [storeName, setStoreName] = useState('Chormokar Store');
  const [storeTagline, setStoreTagline] = useState('Everything you need, in a blink');
  const [supportEmail, setSupportEmail] = useState('chormokar@outlook.com');
  const [supportPhone, setSupportPhone] = useState('+880 1846-956752');
  const [currency, setCurrency] = useState('BDT');
  const [timezone, setTimezone] = useState('Asia/Dhaka');

  // Payment Settings State
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [requirePhoneAtCheckout, setRequirePhoneAtCheckout] = useState(true);

  // Shipping Settings State (Mutual exclusivity)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('100');
  const [flatRateShipping, setFlatRateShipping] = useState('15');
  const [pathaoEnabled, setPathaoEnabled] = useState(true);
  const [steadfastEnabled, setSteadfastEnabled] = useState(false);

  // Pathao Courier Credentials State
  const [pathaoEnv, setPathaoEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [pathaoClientId, setPathaoClientId] = useState('7N1aMJQbWm');
  const [pathaoClientSecret, setPathaoClientSecret] = useState('wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39');
  const [pathaoUsername, setPathaoUsername] = useState('test@pathao.com');
  const [pathaoPassword, setPathaoPassword] = useState('lovePathao');
  const [pathaoStoreId, setPathaoStoreId] = useState('1');

  // Steadfast Courier Credentials State
  const [steadfastApiKey, setSteadfastApiKey] = useState('');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState('');

  // Notifications Settings State
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyRefund, setNotifyRefund] = useState(true);

  // Security Settings State
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24h');

  // Synchronize persisted settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cityblink_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.storeName !== undefined) setStoreName(parsed.storeName);
        if (parsed.storeTagline !== undefined) setStoreTagline(parsed.storeTagline);
        if (parsed.supportEmail !== undefined) setSupportEmail(parsed.supportEmail);
        if (parsed.supportPhone !== undefined) setSupportPhone(parsed.supportPhone);
        if (parsed.currency !== undefined) setCurrency(parsed.currency);
        if (parsed.timezone !== undefined) setTimezone(parsed.timezone);
        if (parsed.autoGenerateInvoice !== undefined) setAutoGenerateInvoice(parsed.autoGenerateInvoice);
        if (parsed.requirePhoneAtCheckout !== undefined) setRequirePhoneAtCheckout(parsed.requirePhoneAtCheckout);
        if (parsed.freeShippingThreshold !== undefined) setFreeShippingThreshold(parsed.freeShippingThreshold);
        if (parsed.flatRateShipping !== undefined) setFlatRateShipping(parsed.flatRateShipping);
        if (parsed.pathaoEnabled !== undefined) setPathaoEnabled(parsed.pathaoEnabled);
        if (parsed.steadfastEnabled !== undefined) setSteadfastEnabled(parsed.steadfastEnabled);
        if (parsed.pathaoEnv !== undefined) setPathaoEnv(parsed.pathaoEnv);
        if (parsed.pathaoClientId !== undefined) setPathaoClientId(parsed.pathaoClientId);
        if (parsed.pathaoClientSecret !== undefined) setPathaoClientSecret(parsed.pathaoClientSecret);
        if (parsed.pathaoUsername !== undefined) setPathaoUsername(parsed.pathaoUsername);
        if (parsed.pathaoPassword !== undefined) setPathaoPassword(parsed.pathaoPassword);
        if (parsed.pathaoStoreId !== undefined) setPathaoStoreId(parsed.pathaoStoreId);
        if (parsed.steadfastApiKey !== undefined) setSteadfastApiKey(parsed.steadfastApiKey);
        if (parsed.steadfastSecretKey !== undefined) setSteadfastSecretKey(parsed.steadfastSecretKey);
        if (parsed.notifyNewOrder !== undefined) setNotifyNewOrder(parsed.notifyNewOrder);
        if (parsed.notifyLowStock !== undefined) setNotifyLowStock(parsed.notifyLowStock);
        if (parsed.notifyRefund !== undefined) setNotifyRefund(parsed.notifyRefund);
        if (parsed.twoFactorAuth !== undefined) setTwoFactorAuth(parsed.twoFactorAuth);
        if (parsed.sessionTimeout !== undefined) setSessionTimeout(parsed.sessionTimeout);
      }
    } catch {
      // ignore JSON or localStorage errors
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFieldChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleSave = () => {
    // Validate credentials for active provider
    if (pathaoEnabled && (!pathaoClientId.trim() || !pathaoClientSecret.trim() || !pathaoUsername.trim() || !pathaoPassword.trim())) {
      showToast('Pathao Courier is active but Client ID, Client Secret, Username, or Password is missing.', 'error');
      return;
    }
    if (steadfastEnabled && (!steadfastApiKey.trim() || !steadfastSecretKey.trim())) {
      showToast('Steadfast Courier is active but API Key or Secret Key is missing.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = {
        storeName,
        storeTagline,
        supportEmail,
        supportPhone,
        currency,
        timezone,
        autoGenerateInvoice,
        requirePhoneAtCheckout,
        freeShippingThreshold,
        flatRateShipping,
        pathaoEnabled,
        steadfastEnabled,
        pathaoEnv,
        pathaoClientId,
        pathaoClientSecret,
        pathaoUsername,
        pathaoPassword,
        pathaoStoreId,
        steadfastApiKey,
        steadfastSecretKey,
        notifyNewOrder,
        notifyLowStock,
        notifyRefund,
        twoFactorAuth,
        sessionTimeout,
      };
      localStorage.setItem('cityblink_admin_settings', JSON.stringify(dataToSave));
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsSaving(false);
      setIsDirty(false);
      showToast('All settings changes saved successfully!', 'success');
    }, 600);
  };

  const handleDiscard = () => {
    try {
      const saved = localStorage.getItem('cityblink_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.storeName !== undefined) setStoreName(parsed.storeName);
        if (parsed.storeTagline !== undefined) setStoreTagline(parsed.storeTagline);
        if (parsed.supportEmail !== undefined) setSupportEmail(parsed.supportEmail);
        if (parsed.supportPhone !== undefined) setSupportPhone(parsed.supportPhone);
        if (parsed.currency !== undefined) setCurrency(parsed.currency);
        if (parsed.timezone !== undefined) setTimezone(parsed.timezone);
        if (parsed.autoGenerateInvoice !== undefined) setAutoGenerateInvoice(parsed.autoGenerateInvoice);
        if (parsed.requirePhoneAtCheckout !== undefined) setRequirePhoneAtCheckout(parsed.requirePhoneAtCheckout);
        if (parsed.freeShippingThreshold !== undefined) setFreeShippingThreshold(parsed.freeShippingThreshold);
        if (parsed.flatRateShipping !== undefined) setFlatRateShipping(parsed.flatRateShipping);
        if (parsed.pathaoEnabled !== undefined) setPathaoEnabled(parsed.pathaoEnabled);
        if (parsed.steadfastEnabled !== undefined) setSteadfastEnabled(parsed.steadfastEnabled);
        if (parsed.pathaoEnv !== undefined) setPathaoEnv(parsed.pathaoEnv);
        if (parsed.pathaoClientId !== undefined) setPathaoClientId(parsed.pathaoClientId);
        if (parsed.pathaoClientSecret !== undefined) setPathaoClientSecret(parsed.pathaoClientSecret);
        if (parsed.pathaoUsername !== undefined) setPathaoUsername(parsed.pathaoUsername);
        if (parsed.pathaoPassword !== undefined) setPathaoPassword(parsed.pathaoPassword);
        if (parsed.pathaoStoreId !== undefined) setPathaoStoreId(parsed.pathaoStoreId);
        if (parsed.steadfastApiKey !== undefined) setSteadfastApiKey(parsed.steadfastApiKey);
        if (parsed.steadfastSecretKey !== undefined) setSteadfastSecretKey(parsed.steadfastSecretKey);
        if (parsed.notifyNewOrder !== undefined) setNotifyNewOrder(parsed.notifyNewOrder);
        if (parsed.notifyLowStock !== undefined) setNotifyLowStock(parsed.notifyLowStock);
        if (parsed.notifyRefund !== undefined) setNotifyRefund(parsed.notifyRefund);
        if (parsed.twoFactorAuth !== undefined) setTwoFactorAuth(parsed.twoFactorAuth);
        if (parsed.sessionTimeout !== undefined) setSessionTimeout(parsed.sessionTimeout);
      }
    } catch {
      // ignore
    }
    setIsDirty(false);
    showToast('Changes discarded', 'warning');
  };

  return (
    <SettingsContext.Provider
      value={{
        storeName,
        setStoreName,
        storeTagline,
        setStoreTagline,
        supportEmail,
        setSupportEmail,
        supportPhone,
        setSupportPhone,
        currency,
        setCurrency,
        timezone,
        setTimezone,
        autoGenerateInvoice,
        setAutoGenerateInvoice,
        requirePhoneAtCheckout,
        setRequirePhoneAtCheckout,
        freeShippingThreshold,
        setFreeShippingThreshold,
        flatRateShipping,
        setFlatRateShipping,
        pathaoEnabled,
        setPathaoEnabled,
        steadfastEnabled,
        setSteadfastEnabled,
        pathaoEnv,
        setPathaoEnv,
        pathaoClientId,
        setPathaoClientId,
        pathaoClientSecret,
        setPathaoClientSecret,
        pathaoUsername,
        setPathaoUsername,
        pathaoPassword,
        setPathaoPassword,
        pathaoStoreId,
        setPathaoStoreId,
        steadfastApiKey,
        setSteadfastApiKey,
        steadfastSecretKey,
        setSteadfastSecretKey,
        notifyNewOrder,
        setNotifyNewOrder,
        notifyLowStock,
        setNotifyLowStock,
        notifyRefund,
        setNotifyRefund,
        twoFactorAuth,
        setTwoFactorAuth,
        sessionTimeout,
        setSessionTimeout,
        isSaving,
        isDirty,
        setIsDirty,
        handleFieldChange,
        handleSave,
        handleDiscard,
        toast,
        showToast,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

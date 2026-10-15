import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { GlobalSetting } from '../../../shared/types';

export interface AppSettings {
  news_ticker: string;
  allow_unit_edit: boolean;
  show_fund_collection: boolean;
  show_programs_page: boolean;
  allow_student_registration: boolean;
  show_membership_page: boolean;
  raw: Record<string, string>;
}

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  news_ticker: 'Welcome to the AHSAS Activity Management Portal!',
  allow_unit_edit: true,
  show_fund_collection: true,
  show_programs_page: false,
  allow_student_registration: true,
  show_membership_page: true,
  raw: {
    news_ticker: 'Welcome to the AHSAS Activity Management Portal!',
    allow_unit_edit: 'true',
    show_fund_collection: 'true',
    show_programs_page: 'false',
    allow_student_registration: 'true',
    show_membership_page: 'true',
  },
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
  updateSetting: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [rawSettings, setRawSettings] = useState<Record<string, string>>(defaultSettings.raw);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value');

      if (!error && data) {
        const mapped: Record<string, string> = {};
        (data as GlobalSetting[]).forEach((s) => {
          mapped[s.key] = s.value;
        });
        setRawSettings((prev) => ({ ...prev, ...mapped }));
      }
    } catch (err) {
      console.error('Error fetching global settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setRawSettings((prev) => ({ ...prev, [key]: value }));

    try {
      const { data, error: updateError } = await supabase
        .from('global_settings')
        .update({ value })
        .eq('key', key)
        .select();

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('global_settings')
          .insert([{ key, value }]);

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error(`Failed to persist setting ${key}:`, err);
      await fetchSettings();
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const parsedSettings: AppSettings = {
    news_ticker: rawSettings.news_ticker || 'Welcome to the AHSAS Activity Management Portal!',
    allow_unit_edit: rawSettings.allow_unit_edit !== 'false',
    show_fund_collection: rawSettings.show_fund_collection === 'true',
    show_programs_page: rawSettings.show_programs_page === 'true',
    allow_student_registration: rawSettings.allow_student_registration !== 'false',
    show_membership_page: rawSettings.show_membership_page !== 'false',
    raw: rawSettings,
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: parsedSettings,
        loading,
        refreshSettings: fetchSettings,
        updateSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

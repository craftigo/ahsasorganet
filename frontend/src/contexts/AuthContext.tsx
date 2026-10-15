import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Unit } from '@shared/types';

export const MASTER_ADMINS = ['ahsaslab@gmail.com', 'mmmed8833@gmail.com'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isUnit: boolean;
  unitData: Unit | null;
  isRegistrationIncomplete: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isUnit: false,
  unitData: null,
  isRegistrationIncomplete: false,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isUnit, setIsUnit] = useState<boolean>(false);
  const [unitData, setUnitData] = useState<Unit | null>(null);
  const [isRegistrationIncomplete, setIsRegistrationIncomplete] = useState<boolean>(false);

  const checkUserRole = async (currentUser: User | null) => {
    if (!currentUser || !currentUser.email) {
      setIsAdmin(false);
      setIsUnit(false);
      setUnitData(null);
      setIsRegistrationIncomplete(false);
      return;
    }

    const email = currentUser.email.toLowerCase();

    // 1. Fast path: Master admin emails
    if (MASTER_ADMINS.includes(email)) {
      setIsAdmin(true);
      setIsUnit(false);
      setUnitData(null);
      setIsRegistrationIncomplete(false);
      return;
    }

    // 2. Check admin_users table
    try {
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (adminRecord) {
        setIsAdmin(true);
        setIsUnit(false);
        setUnitData(null);
        setIsRegistrationIncomplete(false);
        return;
      }
    } catch {
      // If RLS blocked, fallback
    }

    // 3. Check units table
    try {
      const { data: unitRecord } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (unitRecord) {
        setUnitData(unitRecord as Unit);
        setIsUnit(true);
        setIsAdmin(false);

        // Check if committee members are present
        const { data: members } = await supabase
          .from('members')
          .select('id')
          .eq('unit_id', unitRecord.id)
          .limit(1);

        setIsRegistrationIncomplete(!members || members.length === 0);
        return;
      }
    } catch (err) {
      console.error('Error checking unit record:', err);
    }

    setIsAdmin(false);
    setIsUnit(false);
    setUnitData(null);
    setIsRegistrationIncomplete(false);
  };

  const refreshAuth = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await checkUserRole(currentSession?.user ?? null);
    } catch (err) {
      console.error('Auth refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      await checkUserRole(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsUnit(false);
    setUnitData(null);
    setIsRegistrationIncomplete(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isUnit,
        unitData,
        isRegistrationIncomplete,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Gender = 'M' | 'F';

export type UserProfile = {
  gender: Gender;
  testDate: string | null;
  age: string;
  role: string;
  trainingLevel: 'Foundation' | 'Intermediate' | 'Advanced';
  equipment: string;
  injuryNotes: string;
};

type UserContextType = UserProfile & {
  setGender: (g: Gender) => void;
  setTestDate: (d: string | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  replaceProfile: (profile: UserProfile) => void;
  resetProfile: () => void;
  isLoaded: boolean;
};

export const defaultProfile: UserProfile = {
  gender: 'M',
  testDate: null,
  age: '',
  role: 'General readiness',
  trainingLevel: 'Intermediate',
  equipment: 'Ruck, running shoes, basic gym access',
  injuryNotes: '',
};

const STORAGE_KEY = 'sentinel_user_profile';

const UserContext = createContext<UserContextType>({
  ...defaultProfile,
  setGender: () => {},
  setTestDate: () => {},
  updateProfile: () => {},
  replaceProfile: () => {},
  resetProfile: () => {},
  isLoaded: false,
});

export function useUser() {
  const ctx = useContext(UserContext);
  if (__DEV__ && !ctx.isLoaded && ctx.gender === 'M' && ctx.testDate === null) {
    console.warn('UserContext used outside UserProvider or before load');
  }
  return ctx;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!isMounted) return;

      if (raw) {
        try {
          setProfile({ ...defaultProfile, ...JSON.parse(raw) });
        } catch (e) {
          console.error('UserContext: failed to parse stored profile', e);
        }
      }
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const save = useCallback((updated: UserProfile) => {
    setProfile(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) =>
      console.error('UserContext: failed to persist profile', e)
    );
  }, []);

  const contextValue = useMemo(() => ({
    ...profile,
    setGender: (gender: Gender) => save({ ...profile, gender }),
    setTestDate: (testDate: string | null) => save({ ...profile, testDate }),
    updateProfile: (updates: Partial<UserProfile>) => save({ ...profile, ...updates }),
    replaceProfile: (nextProfile: UserProfile) => save({ ...defaultProfile, ...nextProfile }),
    resetProfile: () => save(defaultProfile),
    isLoaded,
  }), [profile, isLoaded, save]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

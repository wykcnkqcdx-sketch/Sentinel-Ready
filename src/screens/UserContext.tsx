import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Gender = 'M' | 'F';

type UserProfile = {
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
  isLoaded: boolean;
};

const defaultProfile: UserProfile = {
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
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setProfile({ ...defaultProfile, ...JSON.parse(raw) });
        } catch (e) {
          console.error('UserContext: failed to parse stored profile', e);
        }
      }
      setIsLoaded(true);
    });
  }, []);

  function save(updated: UserProfile) {
    setProfile(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) =>
      console.error('UserContext: failed to persist profile', e)
    );
  }

  return (
    <UserContext.Provider value={{
      ...profile,
      setGender: (gender) => save({ ...profile, gender }),
      setTestDate: (testDate) => save({ ...profile, testDate }),
      updateProfile: (updates) => save({ ...profile, ...updates }),
      isLoaded,
    }}>
      {children}
    </UserContext.Provider>
  );
}

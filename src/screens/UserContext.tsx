import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Gender = 'M' | 'F';

type UserProfile = {
  gender: Gender;
  testDate: string | null;
};

type UserContextType = UserProfile & {
  setGender: (g: Gender) => void;
  setTestDate: (d: string | null) => void;
};

const STORAGE_KEY = 'sentinel_user_profile';

const UserContext = createContext<UserContextType>({
  gender: 'M',
  testDate: null,
  setGender: () => {},
  setTestDate: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({ gender: 'M', testDate: null });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch {}
      }
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
    }}>
      {children}
    </UserContext.Provider>
  );
}

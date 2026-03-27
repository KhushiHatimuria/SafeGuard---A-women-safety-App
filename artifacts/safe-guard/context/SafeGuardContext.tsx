import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Platform, Vibration } from "react-native";

export type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
};

export type UserProfile = {
  name: string;
  phone: string;
  bloodGroup: string;
  medicalNotes: string;
  photoUri?: string;
};

export type MonitoringSchedule = {
  enabled: boolean;
  alwaysOn: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type SOSState =
  | "idle"
  | "detecting"
  | "verifying"
  | "active"
  | "cancelled";

type SafeGuardContextType = {
  contacts: Contact[];
  userProfile: UserProfile;
  monitoring: MonitoringSchedule;
  sosState: SOSState;
  isMonitoringActive: boolean;
  alertCount: number;
  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateMonitoring: (schedule: Partial<MonitoringSchedule>) => void;
  triggerSOS: () => void;
  cancelSOS: () => void;
  confirmSOS: () => void;
  toggleMonitoring: () => void;
  setSosState: (state: SOSState) => void;
};

const SafeGuardContext = createContext<SafeGuardContextType | null>(null);

const STORAGE_KEYS = {
  contacts: "safeguard_contacts",
  profile: "safeguard_profile",
  monitoring: "safeguard_monitoring",
  alertCount: "safeguard_alert_count",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  phone: "",
  bloodGroup: "",
  medicalNotes: "",
};

const DEFAULT_MONITORING: MonitoringSchedule = {
  enabled: false,
  alwaysOn: false,
  startHour: 22,
  startMinute: 0,
  endHour: 6,
  endMinute: 0,
};

export function SafeGuardProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [monitoring, setMonitoring] =
    useState<MonitoringSchedule>(DEFAULT_MONITORING);
  const [sosState, setSosState] = useState<SOSState>("idle");
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contactsData, profileData, monitoringData, alertCountData] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.contacts),
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.monitoring),
          AsyncStorage.getItem(STORAGE_KEYS.alertCount),
        ]);
      if (contactsData) setContacts(JSON.parse(contactsData));
      if (profileData) setUserProfile(JSON.parse(profileData));
      if (monitoringData) setMonitoring(JSON.parse(monitoringData));
      if (alertCountData) setAlertCount(parseInt(alertCountData, 10));
    } catch {}
  };

  const saveContacts = async (newContacts: Contact[]) => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.contacts,
      JSON.stringify(newContacts)
    );
  };

  const addContact = useCallback(
    (contact: Omit<Contact, "id">) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newContacts = [...contacts, { ...contact, id }];
      setContacts(newContacts);
      saveContacts(newContacts);
    },
    [contacts]
  );

  const updateContact = useCallback(
    (id: string, contact: Partial<Contact>) => {
      const newContacts = contacts.map((c) =>
        c.id === id ? { ...c, ...contact } : c
      );
      setContacts(newContacts);
      saveContacts(newContacts);
    },
    [contacts]
  );

  const removeContact = useCallback(
    (id: string) => {
      const newContacts = contacts.filter((c) => c.id !== id);
      setContacts(newContacts);
      saveContacts(newContacts);
    },
    [contacts]
  );

  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...profile };
      AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateMonitoring = useCallback(
    (schedule: Partial<MonitoringSchedule>) => {
      setMonitoring((prev) => {
        const updated = { ...prev, ...schedule };
        AsyncStorage.setItem(
          STORAGE_KEYS.monitoring,
          JSON.stringify(updated)
        );
        return updated;
      });
    },
    []
  );

  const triggerSOS = useCallback(() => {
    setSosState("verifying");
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 200, 100, 200]);
    }
    verifyTimeoutRef.current = setTimeout(() => {
      confirmSOS();
    }, 8000);
  }, []);

  const confirmSOS = useCallback(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    setSosState("active");
    setAlertCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(STORAGE_KEYS.alertCount, String(next));
      return next;
    });
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }
  }, []);

  const cancelSOS = useCallback(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    setSosState("idle");
    if (Platform.OS !== "web") {
      Vibration.vibrate(100);
    }
  }, []);

  const toggleMonitoring = useCallback(() => {
    setIsMonitoringActive((prev) => !prev);
  }, []);

  return (
    <SafeGuardContext.Provider
      value={{
        contacts,
        userProfile,
        monitoring,
        sosState,
        isMonitoringActive,
        alertCount,
        addContact,
        updateContact,
        removeContact,
        updateProfile,
        updateMonitoring,
        triggerSOS,
        cancelSOS,
        confirmSOS,
        toggleMonitoring,
        setSosState,
      }}
    >
      {children}
    </SafeGuardContext.Provider>
  );
}

export function useSafeGuard() {
  const ctx = useContext(SafeGuardContext);
  if (!ctx) throw new Error("useSafeGuard must be used within SafeGuardProvider");
  return ctx;
}

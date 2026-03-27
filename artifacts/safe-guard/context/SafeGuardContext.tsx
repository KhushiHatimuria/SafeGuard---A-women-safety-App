import AsyncStorage from "@react-native-async-storage/async-storage";
import { Accelerometer } from "expo-sensors";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Platform, Vibration } from "react-native";

import { api, type ApiAlert } from "@/lib/api";

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
};

export type MonitoringSchedule = {
  enabled: boolean;
  alwaysOn: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  keywordSpotting: boolean;
  motionDetection: boolean;
  autoEscalate: boolean;
  sensitivity: "low" | "medium" | "high";
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
  activeAlertId: string | null;
  motionAlert: boolean;
  isLoadingContacts: boolean;
  addContact: (contact: Omit<Contact, "id">) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateMonitoring: (schedule: Partial<MonitoringSchedule>) => void;
  triggerSOS: (triggerType?: "manual" | "auto" | "keyword" | "motion") => void;
  cancelSOS: () => void;
  confirmSOS: (triggerType?: "manual" | "auto" | "keyword" | "motion") => Promise<void>;
  deactivateSOS: () => Promise<void>;
  toggleMonitoring: () => void;
  setSosState: (state: SOSState) => void;
  setActiveAlertId: (id: string | null) => void;
  dismissMotionAlert: () => void;
  reloadContacts: () => Promise<void>;
};

const SafeGuardContext = createContext<SafeGuardContextType | null>(null);

const STORAGE_KEYS = {
  monitoring: "safeguard_monitoring_v2",
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
  keywordSpotting: true,
  motionDetection: true,
  autoEscalate: true,
  sensitivity: "medium",
};

const MOTION_THRESHOLD: Record<string, number> = {
  low: 3.5,
  medium: 2.8,
  high: 2.0,
};

export function SafeGuardProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [monitoring, setMonitoring] = useState<MonitoringSchedule>(DEFAULT_MONITORING);
  const [sosState, setSosState] = useState<SOSState>("idle");
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [motionAlert, setMotionAlert] = useState(false);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const motionWindowRef = useRef<number[]>([]);
  const motionAlertCooldownRef = useRef(false);
  const triggerTypeRef = useRef<"manual" | "auto" | "keyword" | "motion">("manual");

  useEffect(() => {
    loadLocalData();
    loadRemoteData();
  }, []);

  useEffect(() => {
    if (isMonitoringActive && monitoring.motionDetection && Platform.OS !== "web") {
      startAccelerometer();
    } else {
      stopAccelerometer();
    }
    return () => stopAccelerometer();
  }, [isMonitoringActive, monitoring.motionDetection, monitoring.sensitivity]);

  const startAccelerometer = async () => {
    try {
      const { status } = await Accelerometer.requestPermissionsAsync();
      if (status !== "granted") return;
      Accelerometer.setUpdateInterval(300);
      accelSubscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        motionWindowRef.current.push(magnitude);
        if (motionWindowRef.current.length > 10) {
          motionWindowRef.current.shift();
        }
        if (motionWindowRef.current.length < 5) return;
        const avg = motionWindowRef.current.reduce((a, b) => a + b, 0) / motionWindowRef.current.length;
        const threshold = MOTION_THRESHOLD[monitoring.sensitivity] ?? 2.8;
        if (avg > threshold && !motionAlertCooldownRef.current) {
          motionAlertCooldownRef.current = true;
          setMotionAlert(true);
          if (Platform.OS !== "web") {
            Vibration.vibrate([0, 100, 50, 100]);
          }
          setTimeout(() => {
            motionAlertCooldownRef.current = false;
          }, 15000);
        }
      });
    } catch (e) {
    }
  };

  const stopAccelerometer = () => {
    if (accelSubscriptionRef.current) {
      accelSubscriptionRef.current.remove();
      accelSubscriptionRef.current = null;
    }
    motionWindowRef.current = [];
  };

  const dismissMotionAlert = useCallback(() => {
    setMotionAlert(false);
  }, []);

  const loadLocalData = async () => {
    try {
      const [monitoringData, alertCountData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.monitoring),
        AsyncStorage.getItem(STORAGE_KEYS.alertCount),
      ]);
      if (monitoringData) setMonitoring(JSON.parse(monitoringData));
      if (alertCountData) setAlertCount(parseInt(alertCountData, 10));
    } catch {}
  };

  const loadRemoteData = async () => {
    await Promise.all([reloadContacts(), reloadProfile()]);
  };

  const reloadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const apiContacts = await api.contacts.list();
      setContacts(
        apiContacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          relationship: c.relationship,
          isPrimary: c.isPrimary,
        }))
      );
    } catch {
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const reloadProfile = async () => {
    try {
      const profile = await api.profile.get();
      setUserProfile({
        name: profile.name,
        phone: profile.phone,
        bloodGroup: profile.bloodGroup,
        medicalNotes: profile.medicalNotes,
      });
    } catch {
    }
  };

  const addContact = useCallback(async (contact: Omit<Contact, "id">) => {
    const created = await api.contacts.create(contact);
    setContacts((prev) => [
      ...prev,
      { id: created.id, name: created.name, phone: created.phone, relationship: created.relationship, isPrimary: created.isPrimary },
    ]);
  }, []);

  const updateContact = useCallback(async (id: string, contact: Partial<Contact>) => {
    setContacts((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      const updated = { ...existing, ...contact };
      api.contacts.update(id, {
        name: updated.name,
        phone: updated.phone,
        relationship: updated.relationship,
        isPrimary: updated.isPrimary,
      }).catch(() => {});
      return prev.map((c) => (c.id === id ? updated : c));
    });
  }, []);

  const removeContact = useCallback(async (id: string) => {
    await api.contacts.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...profile };
      api.profile.upsert({
        name: updated.name,
        phone: updated.phone,
        bloodGroup: updated.bloodGroup,
        medicalNotes: updated.medicalNotes,
      }).catch(() => {});
      return updated;
    });
  }, []);

  const updateMonitoring = useCallback((schedule: Partial<MonitoringSchedule>) => {
    setMonitoring((prev) => {
      const updated = { ...prev, ...schedule };
      AsyncStorage.setItem(STORAGE_KEYS.monitoring, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const triggerSOS = useCallback((triggerType: "manual" | "auto" | "keyword" | "motion" = "manual") => {
    triggerTypeRef.current = triggerType;
    setSosState("verifying");
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 200, 100, 200]);
    }
    verifyTimeoutRef.current = setTimeout(() => {
      confirmSOS(triggerType);
    }, 8000);
  }, []);

  const confirmSOS = useCallback(async (triggerType?: "manual" | "auto" | "keyword" | "motion") => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    setSosState("active");
    const count = contacts.length;
    setAlertCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(STORAGE_KEYS.alertCount, String(next));
      return next;
    });
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }
    try {
      const alert = await api.alerts.create({
        triggerType: triggerType ?? triggerTypeRef.current ?? "manual",
        contactsNotified: count,
        audioRecorded: false,
      });
      setActiveAlertId(alert.id);
    } catch {}
  }, [contacts.length]);

  const cancelSOS = useCallback(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    setSosState("idle");
    if (Platform.OS !== "web") {
      Vibration.vibrate(100);
    }
  }, []);

  const deactivateSOS = useCallback(async () => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    if (activeAlertId) {
      try {
        await api.alerts.update(activeAlertId, { status: "resolved" });
      } catch {}
      setActiveAlertId(null);
    }
    setSosState("idle");
  }, [activeAlertId]);

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
        activeAlertId,
        motionAlert,
        isLoadingContacts,
        addContact,
        updateContact,
        removeContact,
        updateProfile,
        updateMonitoring,
        triggerSOS,
        cancelSOS,
        confirmSOS,
        deactivateSOS,
        toggleMonitoring,
        setSosState,
        setActiveAlertId,
        dismissMotionAlert,
        reloadContacts,
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

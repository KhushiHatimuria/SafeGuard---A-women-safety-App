import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { Accelerometer } from "expo-sensors";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, Vibration } from "react-native";

import { api } from "@/lib/api";

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
  vibrateOnDetect: boolean;
  autoEscalate: boolean;
  sensitivity: "low" | "medium" | "high";
  codeword: string;
};

export type SOSState = "idle" | "detecting" | "verifying" | "active" | "cancelled";
export type TriggerType = "manual" | "auto" | "keyword" | "motion";

type SafeGuardContextType = {
  contacts: Contact[];
  userProfile: UserProfile;
  monitoring: MonitoringSchedule;
  sosState: SOSState;
  isMonitoringActive: boolean;
  alertCount: number;
  activeAlertId: string | null;
  motionAlert: boolean;
  voiceListening: boolean;
  lastDetection: { type: string; keywords: string[]; confidence: number } | null;
  isLoadingContacts: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  addContact: (contact: Omit<Contact, "id">) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateMonitoring: (schedule: Partial<MonitoringSchedule>) => void;
  triggerSOS: (triggerType?: TriggerType) => void;
  cancelSOS: () => void;
  confirmSOS: (triggerType?: TriggerType) => Promise<void>;
  deactivateSOS: () => Promise<void>;
  toggleMonitoring: () => void;
  setSosState: (state: SOSState) => void;
  setActiveAlertId: (id: string | null) => void;
  dismissMotionAlert: () => void;
  reloadContacts: () => Promise<void>;
};

const SafeGuardContext = createContext<SafeGuardContextType | null>(null);

const STORAGE_KEYS = {
  monitoring: "safeguard_monitoring_v3",
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
  vibrateOnDetect: true,
  autoEscalate: true,
  sensitivity: "medium",
  codeword: "",
};

const MOTION_THRESHOLD: Record<string, number> = {
  low: 3.5,
  medium: 2.8,
  high: 2.0,
};

const VOICE_CLIP_DURATION = 5000;
const VOICE_LOOP_INTERVAL = 8000;

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
  const [voiceListening, setVoiceListening] = useState(false);
  const [lastDetection, setLastDetection] = useState<{
    type: string;
    keywords: string[];
    confidence: number;
  } | null>(null);

  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const motionWindowRef = useRef<number[]>([]);
  const motionCooldownRef = useRef(false);
  const voiceLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRecordingRef = useRef<Audio.Recording | null>(null);
  const triggerTypeRef = useRef<TriggerType>("manual");
  const sosStateRef = useRef<SOSState>("idle");
  const monitoringRef = useRef<MonitoringSchedule>(DEFAULT_MONITORING);
  const isMonitoringActiveRef = useRef(false);
  const contactsRef = useRef<Contact[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep refs in sync so closures have fresh values
  useEffect(() => { sosStateRef.current = sosState; }, [sosState]);
  useEffect(() => { monitoringRef.current = monitoring; }, [monitoring]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { isMonitoringActiveRef.current = isMonitoringActive; }, [isMonitoringActive]);

  useEffect(() => {
    loadLocalData();
    loadRemoteData();
  }, []);

  // ── Monitoring schedule enforcement ───────────────────────────────────────
  useEffect(() => {
    if (!monitoring.enabled) {
      setIsMonitoringActive(false);
      return;
    }

    const checkSchedule = () => {
      if (monitoring.alwaysOn) {
        setIsMonitoringActive(true);
        return;
      }

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const startMins = monitoring.startHour * 60 + monitoring.startMinute;
      const endMins = monitoring.endHour * 60 + monitoring.endMinute;

      let inWindow: boolean;
      if (startMins <= endMins) {
        inWindow = currentMins >= startMins && currentMins < endMins;
      } else {
        inWindow = currentMins >= startMins || currentMins < endMins;
      }
      setIsMonitoringActive(inWindow);
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60 * 1000);
    return () => clearInterval(interval);
  }, [
    monitoring.enabled,
    monitoring.alwaysOn,
    monitoring.startHour,
    monitoring.startMinute,
    monitoring.endHour,
    monitoring.endMinute,
  ]);

  // Start/stop accelerometer based on monitoring state (native only)
  useEffect(() => {
    if (isMonitoringActive && monitoring.motionDetection && Platform.OS !== "web") {
      startAccelerometer();
    } else {
      stopAccelerometer();
    }
    return () => stopAccelerometer();
  }, [isMonitoringActive, monitoring.motionDetection, monitoring.sensitivity]);

  // Web accelerometer via DeviceMotion API
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isMonitoringActive || !monitoring.motionDetection) return;

    const handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const mag = Math.sqrt(x * x + y * y + z * z);
      motionWindowRef.current.push(mag);
      if (motionWindowRef.current.length > 10) motionWindowRef.current.shift();
      if (motionWindowRef.current.length < 5) return;
      const avg = motionWindowRef.current.reduce((a, b) => a + b, 0) / motionWindowRef.current.length;
      const threshold = MOTION_THRESHOLD[monitoringRef.current.sensitivity] ?? 2.8;
      if (avg > threshold && !motionCooldownRef.current) {
        motionCooldownRef.current = true;
        setMotionAlert(true);
        if (monitoringRef.current.autoEscalate && sosStateRef.current === "idle") {
          triggerSOS("motion");
        }
        setTimeout(() => { motionCooldownRef.current = false; }, 10000);
      }
    };

    const requestAndListen = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        try {
          const perm = await (DeviceMotionEvent as any).requestPermission();
          if (perm !== "granted") return;
        } catch { return; }
      }
      window.addEventListener("devicemotion", handler);
    };

    requestAndListen();
    return () => window.removeEventListener("devicemotion", handler);
  }, [isMonitoringActive, monitoring.motionDetection, monitoring.sensitivity]);

  // Start/stop voice monitoring loop (native only)
  useEffect(() => {
    if (isMonitoringActive && monitoring.keywordSpotting && Platform.OS !== "web") {
      startVoiceMonitoringLoop();
    } else {
      stopVoiceMonitoringLoop();
    }
    return () => stopVoiceMonitoringLoop();
  }, [isMonitoringActive, monitoring.keywordSpotting]);

  // Web codeword + distress keyword detection via SpeechRecognition API
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isMonitoringActive || !monitoring.keywordSpotting) {
      setVoiceListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const WEB_DISTRESS_KEYWORDS = [
      "help", "stop", "no", "police", "emergency", "danger", "fire", "911",
      "save me", "let me go", "please stop", "somebody help",
    ];

    recognition.onstart = () => setVoiceListening(true);

    recognition.onend = () => {
      if (isMonitoringActiveRef.current && monitoringRef.current.keywordSpotting) {
        try { recognition.start(); } catch {}
      } else {
        setVoiceListening(false);
      }
    };

    recognition.onerror = () => {
      setTimeout(() => {
        if (isMonitoringActiveRef.current && monitoringRef.current.keywordSpotting) {
          try { recognition.start(); } catch {}
        }
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ")
        .toLowerCase()
        .trim();
      if (!transcript) return;

      const codeword = monitoringRef.current.codeword?.toLowerCase().trim();
      if (codeword && transcript.includes(codeword)) {
        setLastDetection({ type: "codeword", keywords: [codeword], confidence: 0.99 });
        if (monitoringRef.current.autoEscalate && sosStateRef.current === "idle") {
          triggerSOS("keyword");
        }
        return;
      }

      const detected = WEB_DISTRESS_KEYWORDS.filter((kw) => transcript.includes(kw));
      if (detected.length >= 2 && sosStateRef.current === "idle") {
        setLastDetection({ type: "keyword", keywords: detected, confidence: 0.75 });
        if (monitoringRef.current.autoEscalate) {
          triggerSOS("auto");
        }
      }
    };

    try { recognition.start(); } catch {}

    return () => {
      try { recognition.stop(); } catch {}
      setVoiceListening(false);
    };
  }, [isMonitoringActive, monitoring.keywordSpotting]);

  const loadLocalData = async () => {
    try {
      const monitoringData = await AsyncStorage.getItem(STORAGE_KEYS.monitoring);
      if (monitoringData) {
        const parsed = JSON.parse(monitoringData);
        setMonitoring({ ...DEFAULT_MONITORING, ...parsed });
      }
      // Load cached alert count immediately for fast display
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.alertCount);
      if (cached) setAlertCount(parseInt(cached, 10));
    } catch {}
  };

  const loadRemoteData = async () => {
    // Load contacts and profile in parallel, don't block rendering
    reloadContacts().catch(() => {});
    reloadProfile().catch(() => {});
    reloadAlertCount().catch(() => {});
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
    } catch {}
  };

  const reloadAlertCount = async () => {
    try {
      const alerts = await api.alerts.list();
      const count = alerts.length;
      setAlertCount(count);
      AsyncStorage.setItem(STORAGE_KEYS.alertCount, String(count));
    } catch {}
  };

  // ── Accelerometer motion detection ────────────────────────────────────────
  const startAccelerometer = async () => {
    try {
      const { status } = await Accelerometer.requestPermissionsAsync();
      if (status !== "granted") return;
      Accelerometer.setUpdateInterval(200);
      accelSubscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
        const mag = Math.sqrt(x * x + y * y + z * z);
        motionWindowRef.current.push(mag);
        if (motionWindowRef.current.length > 10) motionWindowRef.current.shift();
        if (motionWindowRef.current.length < 5) return;
        const avg =
          motionWindowRef.current.reduce((a, b) => a + b, 0) /
          motionWindowRef.current.length;
        const threshold = MOTION_THRESHOLD[monitoringRef.current.sensitivity] ?? 2.8;
        if (avg > threshold && !motionCooldownRef.current) {
          motionCooldownRef.current = true;
          setMotionAlert(true);
          if (monitoringRef.current.vibrateOnDetect) Vibration.vibrate([0, 100, 50, 100]);
          if (monitoringRef.current.autoEscalate && sosStateRef.current === "idle") {
            triggerSOS("motion");
          }
          setTimeout(() => { motionCooldownRef.current = false; }, 10000);
        }
      });
    } catch {}
  };

  const stopAccelerometer = () => {
    accelSubscriptionRef.current?.remove();
    accelSubscriptionRef.current = null;
    motionWindowRef.current = [];
  };

  // ── Voice monitoring loop ─────────────────────────────────────────────────
  const startVoiceMonitoringLoop = () => {
    stopVoiceMonitoringLoop();
    const loop = async () => {
      if (!isMonitoringActiveRef.current || sosStateRef.current !== "idle") {
        voiceLoopRef.current = setTimeout(loop, VOICE_LOOP_INTERVAL);
        return;
      }
      await recordAndClassify();
      voiceLoopRef.current = setTimeout(loop, VOICE_LOOP_INTERVAL);
    };
    voiceLoopRef.current = setTimeout(loop, 2000);
  };

  const stopVoiceMonitoringLoop = () => {
    if (voiceLoopRef.current) {
      clearTimeout(voiceLoopRef.current);
      voiceLoopRef.current = null;
    }
    stopCurrentRecording();
    setVoiceListening(false);
  };

  const stopCurrentRecording = async () => {
    if (voiceRecordingRef.current) {
      try {
        await voiceRecordingRef.current.stopAndUnloadAsync();
      } catch {}
      voiceRecordingRef.current = null;
    }
  };

  const recordAndClassify = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      voiceRecordingRef.current = recording;
      setVoiceListening(true);

      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: "aac",
          audioQuality: 96,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
      });

      await recording.startAsync();
      await new Promise((r) => setTimeout(r, VOICE_CLIP_DURATION));

      await recording.stopAndUnloadAsync();
      setVoiceListening(false);

      const uri = recording.getURI();
      voiceRecordingRef.current = null;

      if (!uri || sosStateRef.current !== "idle") return;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });

      const result = await api.classify.audio({
        audioBase64: base64,
        mimeType: "audio/mp4",
        durationSeconds: VOICE_CLIP_DURATION / 1000,
        codeword: monitoringRef.current.codeword || undefined,
      });

      if (result.isDistress || result.codewordDetected) {
        setLastDetection({
          type: result.codewordDetected ? "codeword" : "keyword",
          keywords: result.detectedKeywords,
          confidence: result.confidence,
        });
        if (monitoringRef.current.vibrateOnDetect) Vibration.vibrate([0, 200, 100, 200]);
        const shouldTrigger = result.triggerSOS || result.codewordDetected;
        if (shouldTrigger && monitoringRef.current.autoEscalate && sosStateRef.current === "idle") {
          triggerSOS(result.codewordDetected ? "keyword" : "auto");
        }
      }

      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
    } catch {
      setVoiceListening(false);
      voiceRecordingRef.current = null;
    }
  };

  // ── Helper: get current location ─────────────────────────────────────────
  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
      };
    } catch {
      return null;
    }
  };

  // ── SOS flow ───────────────────────────────────────────────────────────────
  const triggerSOS = useCallback((triggerType: TriggerType = "manual") => {
    triggerTypeRef.current = triggerType;
    setSosState("verifying");
    if (Platform.OS !== "web") Vibration.vibrate([0, 200, 100, 200]);
    verifyTimeoutRef.current = setTimeout(() => {
      confirmSOSInternal(triggerType);
    }, 8000);
  }, []);

  const confirmSOSInternal = async (triggerType: TriggerType) => {
    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    setSosState("active");
    if (Platform.OS !== "web") Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    try {
      // Get location and contacts snapshot in parallel
      const [loc, currentContacts] = await Promise.all([
        Platform.OS !== "web" ? getCurrentLocation() : Promise.resolve(null),
        Promise.resolve(contactsRef.current),
      ]);

      // Build the SMS message
      const mapLink = loc
        ? ` Location: https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
        : "";
      const sosMessage = `🚨 EMERGENCY ALERT! I may be in danger and need help immediately.${mapLink} — SafeGuard`;

      // Send SMS directly from device using expo-sms (works without any API key)
      let deviceSmsSent = 0;
      if (Platform.OS !== "web" && currentContacts.length > 0) {
        try {
          const isAvailable = await SMS.isAvailableAsync();
          if (isAvailable) {
            const phones = currentContacts.map((c) => c.phone);
            const { result } = await SMS.sendSMSAsync(phones, sosMessage);
            // result is "sent", "cancelled", or "unknown"
            if (result === "sent") deviceSmsSent = currentContacts.length;
          }
        } catch {
          // SMS sending failed — server-side TextBelt will still try
        }
      }

      // Create alert record on server (server also attempts TextBelt SMS as backup)
      const alert = await api.alerts.create({
        triggerType,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        accuracy: loc?.accuracy,
        contactsNotified: deviceSmsSent,
        audioRecorded: false,
      });
      setActiveAlertId(alert.id);
      setAlertCount((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(STORAGE_KEYS.alertCount, String(next));
        return next;
      });
    } catch {}
  };

  const confirmSOS = useCallback(async (triggerType?: TriggerType) => {
    await confirmSOSInternal(triggerType ?? triggerTypeRef.current ?? "manual");
  }, []);

  const cancelSOS = useCallback(() => {
    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    setSosState("idle");
    if (Platform.OS !== "web") Vibration.vibrate(100);
  }, []);

  const deactivateSOS = useCallback(async () => {
    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    const id = activeAlertId;
    if (id) {
      try { await api.alerts.update(id, { status: "resolved" }); } catch {}
      setActiveAlertId(null);
    }
    setSosState("idle");
  }, [activeAlertId]);

  const dismissMotionAlert = useCallback(() => setMotionAlert(false), []);

  // ── Contacts ───────────────────────────────────────────────────────────────
  const addContact = useCallback(async (contact: Omit<Contact, "id">) => {
    const created = await api.contacts.create(contact);
    setContacts((prev) => [
      ...prev,
      {
        id: created.id,
        name: created.name,
        phone: created.phone,
        relationship: created.relationship,
        isPrimary: created.isPrimary,
      },
    ]);
  }, []);

  const updateContact = useCallback(async (id: string, contact: Partial<Contact>) => {
    setContacts((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      const updated = { ...existing, ...contact };
      api.contacts
        .update(id, {
          name: updated.name,
          phone: updated.phone,
          relationship: updated.relationship,
          isPrimary: updated.isPrimary,
        })
        .catch(() => {});
      return prev.map((c) => (c.id === id ? updated : c));
    });
  }, []);

  const removeContact = useCallback(async (id: string) => {
    await api.contacts.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Profile ────────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...profile };
      api.profile
        .upsert({
          name: updated.name,
          phone: updated.phone,
          bloodGroup: updated.bloodGroup,
          medicalNotes: updated.medicalNotes,
        })
        .catch(() => {});
      return updated;
    });
  }, []);

  // ── Monitoring ─────────────────────────────────────────────────────────────
  const updateMonitoring = useCallback((schedule: Partial<MonitoringSchedule>) => {
    setMonitoring((prev) => {
      const updated = { ...prev, ...schedule };
      AsyncStorage.setItem(STORAGE_KEYS.monitoring, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleMonitoring = useCallback(() => {
    // Toggling monitoring activates it immediately (alwaysOn) so the user sees
    // instant feedback. Scheduled mode still limits active hours via the effect above.
    setMonitoring((prev) => {
      const nowEnabled = !prev.enabled;
      const updated = { ...prev, enabled: nowEnabled, alwaysOn: nowEnabled ? true : prev.alwaysOn };
      AsyncStorage.setItem(STORAGE_KEYS.monitoring, JSON.stringify(updated));
      return updated;
    });
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
        voiceListening,
        lastDetection,
        isLoadingContacts,
        wsRef,
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

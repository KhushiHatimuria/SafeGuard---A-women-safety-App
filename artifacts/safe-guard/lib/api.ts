const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server/api`
  : "http://localhost:8080/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export type ApiContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
};

export type ApiProfile = {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  medicalNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiAlert = {
  id: string;
  status: "active" | "resolved" | "cancelled";
  triggerType: "manual" | "auto" | "keyword" | "motion";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  contactsNotified: number;
  audioRecorded: boolean;
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type ClassifyAudioResult = {
  isDistress: boolean;
  confidence: number;
  detectedKeywords: string[];
  reasoning: string;
  codewordDetected: boolean;
  triggerSOS: boolean;
};

export type ClassifyTextResult = {
  isDistress: boolean;
  confidence: number;
  detectedKeywords: string[];
  codewordDetected: boolean;
  triggerSOS: boolean;
};

export const api = {
  profile: {
    get: () => request<ApiProfile>("/profile"),
    upsert: (data: { name: string; phone: string; bloodGroup?: string; medicalNotes?: string }) =>
      request<ApiProfile>("/profile", { method: "POST", body: JSON.stringify(data) }),
  },

  contacts: {
    list: () => request<ApiContact[]>("/contacts"),
    create: (data: { name: string; phone: string; relationship: string; isPrimary: boolean }) =>
      request<ApiContact>("/contacts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name: string; phone: string; relationship: string; isPrimary: boolean }) =>
      request<ApiContact>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/contacts/${id}`, { method: "DELETE" }),
  },

  alerts: {
    list: () => request<ApiAlert[]>("/alerts"),
    create: (data: {
      triggerType: "manual" | "auto" | "keyword" | "motion";
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      contactsNotified: number;
      audioRecorded: boolean;
      notes?: string;
    }) => request<ApiAlert>("/alerts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { status?: "active" | "resolved" | "cancelled"; notes?: string }) =>
      request<ApiAlert>(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    pushLocation: (id: string, data: { latitude: number; longitude: number; accuracy?: number }) =>
      request<{ success: boolean }>(`/alerts/${id}/location`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  classify: {
    audio: (data: {
      audioBase64: string;
      mimeType: string;
      durationSeconds?: number;
      codeword?: string;
    }) => request<ClassifyAudioResult>("/classify/audio", { method: "POST", body: JSON.stringify(data) }),

    text: (text: string, codeword?: string) =>
      request<ClassifyTextResult>("/classify/text", {
        method: "POST",
        body: JSON.stringify({ text, codeword }),
      }),
  },
};

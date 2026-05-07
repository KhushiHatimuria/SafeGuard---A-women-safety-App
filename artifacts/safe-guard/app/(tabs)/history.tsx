import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { api, type ApiAlert } from "@/lib/api";

const TRIGGER_ICONS: Record<string, string> = {
  manual: "hand-wave",
  auto: "brain",
  keyword: "microphone",
  motion: "run-fast",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual SOS",
  auto: "Auto Detection",
  keyword: "Keyword Alert",
  motion: "Motion Alert",
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.primary,
  resolved: COLORS.success,
  cancelled: COLORS.textMuted,
};

function AlertCard({ alert }: { alert: ApiAlert }) {
  const date = new Date(alert.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let duration = "";
  if (alert.resolvedAt) {
    const ms = new Date(alert.resolvedAt).getTime() - date.getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  return (
    <View style={styles.alertCard}>
      <View style={styles.alertCardHeader}>
        <View style={[styles.triggerBadge, { borderColor: STATUS_COLORS[alert.status] + "40" }]}>
          <MaterialCommunityIcons
            name={(TRIGGER_ICONS[alert.triggerType] ?? "alert") as any}
            size={14}
            color={STATUS_COLORS[alert.status]}
          />
          <Text style={[styles.triggerLabel, { color: STATUS_COLORS[alert.status] }]}>
            {TRIGGER_LABELS[alert.triggerType] ?? alert.triggerType}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[alert.status] + "20" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[alert.status] }]}>
            {alert.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.alertMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{dateStr} · {timeStr}</Text>
        </View>
        {alert.latitude && (
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>
              {alert.latitude.toFixed(4)}, {alert.longitude?.toFixed(4)}
            </Text>
          </View>
        )}
        {duration && (
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>Duration: {duration}</Text>
          </View>
        )}
      </View>

      <View style={styles.alertStats}>
        <View style={styles.statChip}>
          <Feather name="users" size={11} color={COLORS.textMuted} />
          <Text style={styles.statText}>{alert.contactsNotified} notified</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons
            name={alert.audioRecorded ? "microphone" : "microphone-off"}
            size={11}
            color={alert.audioRecorded ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.statText, alert.audioRecorded && { color: COLORS.primary }]}>
            {alert.audioRecorded ? "Audio recorded" : "No recording"}
          </Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="identifier" size={11} color={COLORS.textMuted} />
          <Text style={styles.statText}>{alert.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 16;
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const loadAlerts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.alerts.list();
      setAlerts(data);
    } catch (e) {
      setError("Could not load history. Check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [])
  );

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  const totalContacts = alerts.reduce((sum, a) => sum + a.contactsNotified, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAlerts(true)}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.heading}>Alert History</Text>
          <Text style={styles.subheading}>All SOS events logged securely</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => loadAlerts(true)}>
          <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
        </Pressable>
      </View>

      {alerts.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalContacts}</Text>
            <Text style={styles.statLabel}>Notified</Text>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorBox}>
          <Feather name="wifi-off" size={20} color={COLORS.warning} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadAlerts()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && alerts.length === 0 && (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="shield-check" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptySubtitle}>
            Your SOS alert history will appear here once you use the emergency feature.
          </Text>
        </View>
      )}

      {!loading && alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, gap: 12 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: COLORS.text },
  subheading: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textMuted, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alertCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  triggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  triggerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  alertMeta: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  alertStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textMuted,
  },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  errorBox: {
    alignItems: "center",
    backgroundColor: COLORS.warning + "10",
    borderRadius: 16,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + "30",
  },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center" },
  retryBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.textSub },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

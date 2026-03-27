import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { useSafeGuard } from "@/context/SafeGuardContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, updateProfile, contacts, alertCount, isMonitoringActive } =
    useSafeGuard();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [phone, setPhone] = useState(userProfile.phone);
  const [bloodGroup, setBloodGroup] = useState(userProfile.bloodGroup);
  const [medicalNotes, setMedicalNotes] = useState(userProfile.medicalNotes);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    updateProfile({ name, phone, bloodGroup, medicalNotes });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditing(false);
  };

  const initials = userProfile.name
    ? userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SG";

  return (
    <View style={[styles.container]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Pressable
          style={styles.editBtn}
          onPress={() => {
            if (editing) {
              handleSave();
            } else {
              setName(userProfile.name);
              setPhone(userProfile.phone);
              setBloodGroup(userProfile.bloodGroup);
              setMedicalNotes(userProfile.medicalNotes);
              setEditing(true);
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }
          }}
        >
          <Feather
            name={editing ? "check" : "edit-2"}
            size={18}
            color={editing ? COLORS.success : COLORS.textSub}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {!editing ? (
            <>
              <Text style={styles.profileName}>
                {userProfile.name || "Your Name"}
              </Text>
              <Text style={styles.profilePhone}>
                {userProfile.phone || "Add phone number"}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{contacts.length}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={styles.statNum}>{alertCount}</Text>
            <Text style={styles.statLabel}>SOS Sent</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="shield-check"
              size={24}
              color={isMonitoringActive ? COLORS.success : COLORS.textMuted}
            />
            <Text style={styles.statLabel}>
              {isMonitoringActive ? "Protected" : "Standby"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PERSONAL INFORMATION</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {userProfile.name || "Not set"}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {userProfile.phone || "Not set"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MEDICAL INFORMATION</Text>
          <Text style={styles.cardSubtitle}>
            Sent with emergency alerts to help responders
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Blood Group</Text>
            {editing ? (
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <Pressable
                    key={bg}
                    style={[
                      styles.chip,
                      bloodGroup === bg && styles.chipActive,
                    ]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        bloodGroup === bg && styles.chipTextActive,
                      ]}
                    >
                      {bg}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>
                {userProfile.bloodGroup || "Not set"}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Medical Notes</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={medicalNotes}
                onChangeText={setMedicalNotes}
                placeholder="Allergies, conditions, medications..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {userProfile.medicalNotes || "None"}
              </Text>
            )}
          </View>
        </View>

        {editing && (
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </Pressable>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="shield-lock"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            Your profile is stored locally on your device and shared only
            during an active emergency alert.
          </Text>
        </View>

        <View style={styles.appInfo}>
          <MaterialCommunityIcons
            name="shield-half-full"
            size={22}
            color={COLORS.primary}
          />
          <Text style={styles.appName}>SafeGuard</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  avatarSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary + "20",
    borderWidth: 2,
    borderColor: COLORS.primary + "40",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxMiddle: {
    borderColor: COLORS.primary + "30",
  },
  statNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    gap: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginBottom: 14,
  },
  field: {
    paddingVertical: 10,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: COLORS.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.bgCard2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSub,
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 17,
  },
  appInfo: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
  },
  appName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: COLORS.textSub,
  },
  appVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
  },
});

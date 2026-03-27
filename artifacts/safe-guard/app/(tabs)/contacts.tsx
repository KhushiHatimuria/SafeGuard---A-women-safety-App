import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { Contact, useSafeGuard } from "@/context/SafeGuardContext";

const RELATIONSHIPS = ["Family", "Friend", "Partner", "Colleague", "Other"];

function AddContactModal({
  visible,
  onClose,
  editContact,
}: {
  visible: boolean;
  onClose: () => void;
  editContact?: Contact | null;
}) {
  const { addContact, updateContact } = useSafeGuard();
  const [name, setName] = useState(editContact?.name ?? "");
  const [phone, setPhone] = useState(editContact?.phone ?? "");
  const [relationship, setRelationship] = useState(
    editContact?.relationship ?? "Family"
  );
  const [isPrimary, setIsPrimary] = useState(editContact?.isPrimary ?? false);

  const handleSave = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please enter name and phone number.");
      return;
    }
    if (editContact) {
      updateContact(editContact.id, { name, phone, relationship, isPrimary });
    } else {
      addContact({ name, phone, relationship, isPrimary });
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>
            {editContact ? "Edit Contact" : "Add Contact"}
          </Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={COLORS.textSub} />
          </Pressable>
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Full Name</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Phone Number</Text>
          <TextInput
            style={modalStyles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Relationship</Text>
          <View style={modalStyles.chipRow}>
            {RELATIONSHIPS.map((r) => (
              <Pressable
                key={r}
                style={[
                  modalStyles.chip,
                  relationship === r && modalStyles.chipActive,
                ]}
                onPress={() => setRelationship(r)}
              >
                <Text
                  style={[
                    modalStyles.chipText,
                    relationship === r && modalStyles.chipTextActive,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={modalStyles.primaryRow}
          onPress={() => setIsPrimary((p) => !p)}
        >
          <View>
            <Text style={modalStyles.primaryTitle}>Primary Contact</Text>
            <Text style={modalStyles.primarySub}>
              Receives alerts first and immediately
            </Text>
          </View>
          <View
            style={[
              modalStyles.toggleSmall,
              isPrimary && modalStyles.toggleSmallActive,
            ]}
          >
            <View
              style={[
                modalStyles.toggleKnobSmall,
                isPrimary && modalStyles.toggleKnobSmallActive,
              ]}
            />
          </View>
        </Pressable>

        <Pressable style={modalStyles.saveBtn} onPress={handleSave}>
          <Text style={modalStyles.saveBtnText}>
            {editContact ? "Save Changes" : "Add Contact"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, removeContact } = useSafeGuard();
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Contact", `Remove ${name} from emergency contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeContact(id);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      },
    ]);
  };

  const primaryContacts = contacts.filter((c) => c.isPrimary);
  const otherContacts = contacts.filter((c) => !c.isPrimary);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.pageTitle}>Emergency Contacts</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="users" size={32} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Contacts Yet</Text>
            <Text style={styles.emptyText}>
              Add trusted people who will receive your emergency alerts with
              your live location.
            </Text>
            <Pressable style={styles.addFirstBtn} onPress={() => setShowAdd(true)}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addFirstBtnText}>Add First Contact</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {primaryContacts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PRIMARY — ALERTED FIRST</Text>
                {primaryContacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={() => {
                      setEditContact(c);
                      setShowAdd(true);
                    }}
                    onDelete={() => handleDelete(c.id, c.name)}
                  />
                ))}
              </View>
            )}

            {otherContacts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ADDITIONAL CONTACTS</Text>
                {otherContacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={() => {
                      setEditContact(c);
                      setShowAdd(true);
                    }}
                    onDelete={() => handleDelete(c.id, c.name)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            All listed contacts receive SMS alerts with your live GPS location
            when SOS is triggered. Primary contacts are notified first.
          </Text>
        </View>
      </ScrollView>

      {showAdd && (
        <AddContactModal
          visible={showAdd}
          editContact={editContact}
          onClose={() => {
            setShowAdd(false);
            setEditContact(null);
          }}
        />
      )}
    </View>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = ["#C8394A", "#2E7D32", "#1565C0", "#6A1B9A", "#E65100"];
  const colorIndex =
    contact.name.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <View style={styles.contactCard}>
      <View style={[styles.avatar, { backgroundColor: avatarColor + "25" }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName}>{contact.name}</Text>
          {contact.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Primary</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
        <Text style={styles.contactRelation}>{contact.relationship}</Text>
      </View>
      <View style={styles.contactActions}>
        <Pressable style={styles.iconBtn} onPress={onEdit}>
          <Feather name="edit-2" size={16} color={COLORS.textSub} />
        </Pressable>
        <Pressable style={[styles.iconBtn, styles.deleteBtn]} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={COLORS.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 20,
  },
  addFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  addFirstBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    marginTop: 2,
  },
  contactRelation: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard2,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: COLORS.primary + "15",
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
});

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
    zIndex: 999,
  },
  container: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: COLORS.bgCard2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
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
    fontFamily: "Inter_500Medium",
    color: COLORS.textSub,
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.text,
  },
  primarySub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggleSmall: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleSmallActive: {
    backgroundColor: COLORS.success,
  },
  toggleKnobSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleKnobSmallActive: {
    alignSelf: "flex-end",
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});

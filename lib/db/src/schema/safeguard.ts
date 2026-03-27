import { pgTable, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  bloodGroup: text("blood_group").notNull().default(""),
  medicalNotes: text("medical_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;

export const contactsTable = pgTable("emergency_contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  relationship: text("relationship").notNull().default("Other"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ createdAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type EmergencyContact = typeof contactsTable.$inferSelect;

export const alertsTable = pgTable("sos_alerts", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["active", "resolved", "cancelled"] }).notNull().default("active"),
  triggerType: text("trigger_type", { enum: ["manual", "auto", "keyword", "motion"] }).notNull().default("manual"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  accuracy: real("accuracy"),
  contactsNotified: integer("contacts_notified").notNull().default(0),
  audioRecorded: boolean("audio_recorded").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;

export const alertLocationsTable = pgTable("alert_locations", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().references(() => alertsTable.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export type AlertLocation = typeof alertLocationsTable.$inferSelect;

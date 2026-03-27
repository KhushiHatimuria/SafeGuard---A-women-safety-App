import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, alertLocationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function mapAlert(a: typeof alertsTable.$inferSelect) {
  return {
    id: a.id,
    status: a.status,
    triggerType: a.triggerType,
    latitude: a.latitude,
    longitude: a.longitude,
    accuracy: a.accuracy,
    contactsNotified: a.contactsNotified,
    audioRecorded: a.audioRecorded,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
  };
}

router.get("/alerts", async (_req, res) => {
  try {
    const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(50);
    return res.json(alerts.map(mapAlert));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/alerts", async (req, res) => {
  try {
    const { triggerType, latitude, longitude, accuracy, contactsNotified, audioRecorded, notes } = req.body;
    const result = await db
      .insert(alertsTable)
      .values({
        id: randomUUID(),
        triggerType: triggerType ?? "manual",
        latitude,
        longitude,
        accuracy,
        contactsNotified: contactsNotified ?? 0,
        audioRecorded: audioRecorded ?? false,
        notes,
      })
      .returning();
    return res.status(201).json(mapAlert(result[0]));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/alerts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updateData: Partial<typeof alertsTable.$inferInsert> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === "resolved" || status === "cancelled") {
      updateData.resolvedAt = new Date();
    }
    const result = await db.update(alertsTable).set(updateData).where(eq(alertsTable.id, id)).returning();
    if (!result.length) return res.status(404).json({ error: "Alert not found" });
    return res.json(mapAlert(result[0]));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/alerts/:id/location", async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy } = req.body;
    await db.insert(alertLocationsTable).values({
      id: randomUUID(),
      alertId: id,
      latitude,
      longitude,
      accuracy,
    });
    await db
      .update(alertsTable)
      .set({ latitude, longitude, accuracy })
      .where(eq(alertsTable.id, id));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

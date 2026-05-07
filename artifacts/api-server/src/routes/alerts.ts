import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, alertLocationsTable, contactsTable, profilesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendSMS } from "../lib/sms";

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
  } catch {
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

    const newAlert = result[0];

    // Fire-and-forget SMS notifications — don't block the response
    (async () => {
      try {
        const [contacts, profiles] = await Promise.all([
          db.select().from(contactsTable),
          db.select().from(profilesTable).limit(1),
        ]);

        const userName = profiles[0]?.name || "Someone";
        const mapLink =
          latitude != null && longitude != null
            ? ` Location: https://maps.google.com/?q=${latitude},${longitude}`
            : "";

        const message = `\uD83D\uDEA8 EMERGENCY ALERT from ${userName}. She may be in danger.${mapLink} This is an automated message from SafeGuard.`;

        let notified = 0;
        await Promise.all(
          contacts.map(async (c) => {
            const sent = await sendSMS(c.phone, message);
            if (sent) notified++;
          })
        );

        if (notified > 0) {
          await db
            .update(alertsTable)
            .set({ contactsNotified: notified })
            .where(eq(alertsTable.id, newAlert.id));
        }
      } catch (err) {
        console.error("[alerts] SMS dispatch error:", err);
      }
    })();

    return res.status(201).json(mapAlert(newAlert));
  } catch {
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
  } catch {
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
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// GPS ping endpoint — receives periodic location updates from the phone during monitoring
router.post("/gps", async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: "latitude and longitude required" });
  }
  return res.json({ success: true, received: { latitude, longitude } });
});

export default router;

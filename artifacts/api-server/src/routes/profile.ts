import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/profile", async (_req, res) => {
  try {
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, "default"));
    if (!profiles.length) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const p = profiles[0];
    return res.json({
      id: p.id,
      name: p.name,
      phone: p.phone,
      bloodGroup: p.bloodGroup,
      medicalNotes: p.medicalNotes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { name, phone, bloodGroup = "", medicalNotes = "" } = req.body;
    const now = new Date();
    const result = await db
      .insert(profilesTable)
      .values({ id: "default", name, phone, bloodGroup, medicalNotes, updatedAt: now })
      .onConflictDoUpdate({
        target: profilesTable.id,
        set: { name, phone, bloodGroup, medicalNotes, updatedAt: now },
      })
      .returning();
    const p = result[0];
    return res.json({
      id: p.id,
      name: p.name,
      phone: p.phone,
      bloodGroup: p.bloodGroup,
      medicalNotes: p.medicalNotes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

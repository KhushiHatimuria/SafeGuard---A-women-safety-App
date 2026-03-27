import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function mapContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    relationship: c.relationship,
    isPrimary: c.isPrimary,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/contacts", async (_req, res) => {
  try {
    const contacts = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
    return res.json(contacts.map(mapContact));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const { name, phone, relationship, isPrimary } = req.body;
    const result = await db
      .insert(contactsTable)
      .values({ id: randomUUID(), name, phone, relationship, isPrimary })
      .returning();
    return res.status(201).json(mapContact(result[0]));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship, isPrimary } = req.body;
    const result = await db
      .update(contactsTable)
      .set({ name, phone, relationship, isPrimary })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!result.length) return res.status(404).json({ error: "Contact not found" });
    return res.json(mapContact(result[0]));
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

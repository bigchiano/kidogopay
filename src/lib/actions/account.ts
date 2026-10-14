"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { kybProfile } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { kybStatus } from "@/lib/limits";
import { sendEmail, appUrl } from "@/lib/mail";
import { fail, ok, type ActionResult } from "./result";

/**
 * Records a verification request. KYB provider integration comes later;
 * for now an operator reviews requests and sets kyb_profile.status by hand.
 */
export async function requestVerification(): Promise<ActionResult> {
  const me = await requireUser();
  const current = await kybStatus(db, me.id);
  if (current === "approved") return fail("Your business is already verified.");
  if (current === "pending") return fail("Your request is already in review.");

  const now = new Date();
  await db
    .insert(kybProfile)
    .values({ userId: me.id, status: "pending", requestedAt: now })
    .onConflictDoUpdate({ target: kybProfile.userId, set: { status: "pending", requestedAt: now, note: null } });

  await sendEmail({
    to: me.email,
    subject: "We've got your verification request",
    heading: "Business verification requested",
    lines: [
      "Thanks. We'll email you shortly with the documents we need, such as your certificate of incorporation and a director's ID.",
      "You can keep using KidogoPay up to your current limit while we review.",
    ],
    action: { label: "Open settings", url: appUrl("/dashboard/settings") },
  });

  revalidatePath("/dashboard", "layout");
  return ok(null);
}

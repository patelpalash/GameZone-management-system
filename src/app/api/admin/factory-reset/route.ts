import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

const COLLECTIONS_TO_CLEAR = [
  "bookings",
  "expenses",
  "inventory_sales",
  "closures"
];

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    
    const idToken = authHeader.split("Bearer ")[1];
    let verifiedUser;
    try {
      verifiedUser = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token." }, { status: 401 });
    }

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map(e => e.trim().toLowerCase());
      
    if (!adminEmails.includes(verifiedUser.email?.toLowerCase() || "")) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 403 });
    }

    // 7 days in milliseconds
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const batch = adminDb.batch();
    let operationCount = 0;

    const commitBatch = async () => {
      if (operationCount > 0) {
        await batch.commit();
        operationCount = 0;
      }
    };

    // 1. Soft-delete collections
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      const snap = await adminDb.collection(collectionName).get();
      for (const doc of snap.docs) {
        const trashRef = adminDb.collection("trash").doc(`${collectionName}_${doc.id}`);
        batch.set(trashRef, {
          originalCollection: collectionName,
          originalId: doc.id,
          data: doc.data(),
          expiresAt: expiresAt,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: verifiedUser.email
        });
        operationCount++;

        batch.delete(doc.ref);
        operationCount++;

        if (operationCount > 400) {
          await commitBatch();
        }
      }
    }

    // 2. Reset Stations
    const stationsSnap = await adminDb.collection("stations").get();
    for (const doc of stationsSnap.docs) {
      batch.update(doc.ref, {
        status: "available",
        currentSessionId: FieldValue.delete()
      });
      operationCount++;
      if (operationCount > 400) {
        await commitBatch();
      }
    }

    await commitBatch();

    return NextResponse.json({ success: true, message: "Factory reset complete. Data moved to trash." });

  } catch (error: unknown) {
    console.error("Factory reset failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

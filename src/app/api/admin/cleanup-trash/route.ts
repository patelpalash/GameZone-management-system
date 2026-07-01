import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

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

    // Parse request body for force flag
    let forceAll = false;
    try {
      const body = await request.json();
      if (body.forceAll) forceAll = true;
    } catch {}

    const now = new Date();
    const query = adminDb.collection("trash");
    let snap;

    if (!forceAll) {
      snap = await query.where("expiresAt", "<=", now).get();
    } else {
      snap = await query.get();
    }

    const batch = adminDb.batch();
    let count = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      count++;
      
      // Firestore batch limit is 500
      if (count % 450 === 0) {
        await batch.commit();
      }
    }

    if (count % 450 !== 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, deletedCount: count });

  } catch (error: unknown) {
    console.error("Cleanup trash failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

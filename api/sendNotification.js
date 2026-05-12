import admin from "firebase-admin";

// Vercel environment variables should be configured in the Vercel dashboard
// under Settings > Environment Variables.
// Required values:
// - FIREBASE_PROJECT_ID
// - FIREBASE_CLIENT_EMAIL
// - FIREBASE_PRIVATE_KEY

/** Same push for every recipient — edit here only. */
const DEFAULT_NOTIFICATION_TITLE = "💌 MinasShow Box";
const DEFAULT_NOTIFICATION_BODY =
  "روح شوف البوكس بتاعك.\n\nفي رسالة جديدة مستنياك في أوضة العرايس 👀";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

function initFirebaseAdmin() {
  if (!admin.apps.length) {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin environment variables. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel.",
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin.app();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  let body = req.body;

  if (!body || typeof body === "string") {
    try {
      body = body ? JSON.parse(body) : {};
    } catch (error) {
      console.error("Invalid JSON body", error);
      return res.status(400).json({
        success: false,
        error: "Invalid JSON body.",
      });
    }
  }

  const { deviceToken } = body;
  if (!deviceToken || typeof deviceToken !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid deviceToken.",
    });
  }

  try {
    initFirebaseAdmin();

    // Web: data-only so the service worker shows exactly once (see firebase-messaging-sw.js).
    const message = {
      token: deviceToken,
      data: {
        push_title: DEFAULT_NOTIFICATION_TITLE,
        push_body: DEFAULT_NOTIFICATION_BODY,
        url: "/",
      },
    };

    const messageId = await admin.messaging().send(message);
    console.log("Notification sent", { messageId, deviceToken });

    return res.status(200).json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notification.",
    });
  }
}

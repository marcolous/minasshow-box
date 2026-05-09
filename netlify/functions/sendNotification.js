const admin = require("firebase-admin");

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "Missing environment variable: FIREBASE_SERVICE_ACCOUNT_KEY",
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY");
  }
}

function getFirebaseApp() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.app();
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

module.exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return jsonResponse(400, {
      success: false,
      error: "Invalid JSON body.",
    });
  }

  const { deviceToken } = payload;
  if (!deviceToken || typeof deviceToken !== "string") {
    return jsonResponse(400, {
      success: false,
      error: "Missing or invalid deviceToken.",
    });
  }

  try {
    getFirebaseApp();

    const message = {
      token: deviceToken,
      notification: {
        title: "💌 MinasShow Box",
        body: "حد سابلك رسالة في اوضة العرايس روح شوف البوكس بتاعك 👀",
      },
    };

    const messageId = await admin.messaging().send(message);
    return jsonResponse(200, {
      success: true,
      messageId,
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return jsonResponse(500, {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notification.",
    });
  }
};

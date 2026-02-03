"use client";

export async function registerPush() {
  try {
    if (!("serviceWorker" in navigator)) return "unsupported";

    const reg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await navigator.serviceWorker.register("/sw.js"));

    const existing = await reg.pushManager.getSubscription();

    const key = urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    );

    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      }));

    await fetch("/api/notifications/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    return "registered";
  } catch (err) {
    console.error("Push registration failed:", err);
    return "error";
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const input = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(input)].map((c) => c.charCodeAt(0)));
}

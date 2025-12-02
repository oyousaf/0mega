export async function registerPush() {
  if (!("serviceWorker" in navigator)) return "unsupported";

  const reg = await navigator.serviceWorker.register("/sw.js");

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  await fetch("/api/notifications/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  return "registered";
}

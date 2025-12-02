export function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;

  try {
    if (document.visibilityState === "visible") return;

    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (err) {
    console.error("Web notification failed:", err);
  }
}

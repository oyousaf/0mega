
export function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

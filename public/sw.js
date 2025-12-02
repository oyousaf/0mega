self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  self.registration.showNotification(data.title || "𝛀MEGA", {
    body: data.body || "",
    icon: "/favicon_32x32.png",
    badge: "/favicon_32x32.png",
  });
});

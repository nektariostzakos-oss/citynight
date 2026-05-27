/**
 * Atelier service worker — install + Web Push only.
 *
 * Generic and tenant-agnostic. The SAME file is served at:
 *   - /sw.js                 standalone customer install (scope /)
 *   - /<slug>/sw.js          a SaaS tenant site (scope /<slug>/)
 * because server.js strips the leading tenant slug before the demo app
 * serves the static file. The registering client picks the scope, so this
 * file never needs to know which tenant it runs for.
 *
 * Deliberately NO offline fetch caching: modern Chrome no longer requires a
 * fetch handler for PWA installability, and an offline cache would add a
 * stale-content surface this template does not need. Push notifications and
 * "Add to Home Screen" are the only goals.
 */

// Activate a freshly installed worker immediately, and take control of any
// open pages, so a push subscription works on the first visit.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * A push arrived. The payload is JSON the server built:
 *   { title, body, icon?, badge?, url?, tag? }
 * Everything is defensive: a malformed or empty payload still shows a
 * sensible notification rather than throwing.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    try {
      data = { body: event.data ? event.data.text() : "" };
    } catch (_e2) {
      data = {};
    }
  }

  const title = (data && data.title) || "Notification";
  const options = {
    body: (data && data.body) || "",
    icon: (data && data.icon) || undefined,
    badge: (data && data.badge) || undefined,
    tag: (data && data.tag) || undefined,
    // Carry the destination URL through to the click handler.
    data: { url: (data && data.url) || "/" },
    // Owner alerts ask to stay on screen until dismissed; on desktop a
    // notification otherwise auto-hides after a few seconds and is missed.
    requireInteraction: !!(data && data.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * The user tapped the notification. Focus an already-open tab if one is on
 * (or under) the target URL, otherwise open a new window. The URL is a
 * fully tenant-correct path the server built (e.g. /<slug>/b/<id>?t=...).
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            const u = new URL(client.url);
            const t = new URL(target, u.origin);
            if (u.origin === t.origin && client.url.indexOf(t.pathname) !== -1) {
              return client.focus();
            }
          } catch (_e) {
            /* ignore a client we can't parse */
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
        return undefined;
      })
  );
});

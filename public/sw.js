// FriendConnect Service Worker (round 15)
// Handles: push notifications, notification clicks, offline cache shell.

const CACHE_NAME = 'friendconnect-v1'
const OFFLINE_URL = '/'

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, '/friendconnect-logo.png']))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'FriendConnect', body: 'New notification' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    if (event.data) data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/friendconnect-logo.png',
      badge: data.badge || '/friendconnect-logo.png',
      data: { url: data.url || '/' },
    })
  )
})

// Notification click — focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Fetch — network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  // Never cache authenticated API requests
  if (request.url.includes('/api/') && !request.url.includes('/api/health')) {
    return // always hit network for API
  }
  // Cache-first for static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          }).catch(() => cached || caches.match(OFFLINE_URL))
        )
      })
    )
  }
})

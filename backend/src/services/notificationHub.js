const MAX_PER_USER = 4;

const clients = new Map();

export const hubKey = (role, id) => `${role}:${id}`;

export function formatEvent({ event, data, id }) {
  return `${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function subscribe(key, client) {
  let set = clients.get(key);
  if (!set) {
    set = new Set();
    clients.set(key, set);
  }
  while (set.size >= MAX_PER_USER) {
    const oldest = set.values().next().value;
    set.delete(oldest);
    oldest.close();
  }
  set.add(client);
  return () => {
    set.delete(client);
    if (!set.size && clients.get(key) === set) clients.delete(key);
  };
}

export const hasSubscribers = (key) => clients.has(key);
export const connectionCount = (key) => clients.get(key)?.size ?? 0;

export function publish(key, event, data, id) {
  const set = clients.get(key);
  if (!set) return 0;
  let delivered = 0;
  for (const client of [...set]) {
    try {
      client.send(event, data, id);
      delivered += 1;
    } catch {
      set.delete(client);
    }
  }
  if (!set.size && clients.get(key) === set) clients.delete(key);
  return delivered;
}

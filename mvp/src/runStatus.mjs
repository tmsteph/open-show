export function createRunStatusFeed(options = {}) {
  const maxEntries = options.maxEntries ?? 40;
  const now = options.now ?? (() => new Date());
  const events = [];

  function add(message, level = "info") {
    const text = String(message ?? "").trim();
    if (!text) {
      return null;
    }

    events.unshift({
      timestamp: now().toISOString(),
      level,
      message: text
    });

    if (events.length > maxEntries) {
      events.length = maxEntries;
    }

    return events[0];
  }

  function list() {
    return [...events];
  }

  return {
    add,
    list
  };
}

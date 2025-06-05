/**
 * Bluff Battle - Event Bus System
 * Centralized event management for decoupled communication between game components
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.maxListeners = PERFORMANCE.MAX_EVENT_LISTENERS;
    this.eventHistory = [];
    this.maxHistorySize = 100;

    if (DEBUG.ENABLED) {
      console.log("EventBus initialized");
    }
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - The event type to listen for
   * @param {Function} callback - The callback function to execute
   * @param {Object} context - Optional context for the callback
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback, context = null) {
    if (!eventType || typeof eventType !== "string") {
      throw new Error(`Invalid event type: ${eventType}`);
    }
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listeners = this.listeners.get(eventType);

    // Check if we're exceeding max listeners
    if (listeners.length >= this.maxListeners) {
      console.warn(
        `Maximum listeners (${this.maxListeners}) reached for event: ${eventType}`
      );
    }

    const listener = { callback, context };
    listeners.push(listener);

    if (DEBUG.ENABLED) {
      console.log(`Event listener added for: ${eventType}`);
    }

    // Return unsubscribe function
    return () => this.off(eventType, callback);
  }

  /**
   * Subscribe to an event that will only fire once
   * @param {string} eventType - The event type to listen for
   * @param {Function} callback - The callback function to execute
   * @param {Object} context - Optional context for the callback
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback, context = null) {
    if (typeof eventType !== "string" || typeof callback !== "function") {
      throw new Error("Invalid event subscription parameters");
    }

    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, []);
    }

    const listener = { callback, context };
    this.onceListeners.get(eventType).push(listener);

    if (DEBUG.ENABLED) {
      console.log(`One-time event listener added for: ${eventType}`);
    }

    // Return unsubscribe function
    return () => this.offOnce(eventType, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - The event type to unsubscribe from
   * @param {Function} callback - The callback function to remove
   */
  off(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      return;
    }

    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(
      (listener) => listener.callback === callback
    );

    if (index !== -1) {
      listeners.splice(index, 1);

      if (DEBUG.ENABLED) {
        console.log(`Event listener removed for: ${eventType}`);
      }
    }

    // Clean up empty arrays
    if (listeners.length === 0) {
      this.listeners.delete(eventType);
    }
  }

  /**
   * Remove a once listener
   * @param {string} eventType - The event type
   * @param {Function} callback - The callback function to remove
   */
  offOnce(eventType, callback) {
    if (!this.onceListeners.has(eventType)) {
      return;
    }

    const listeners = this.onceListeners.get(eventType);
    const index = listeners.findIndex(
      (listener) => listener.callback === callback
    );

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.onceListeners.delete(eventType);
    }
  }

  /**
   * Remove all listeners for an event type
   * @param {string} eventType - The event type to clear
   */
  offAll(eventType) {
    this.listeners.delete(eventType);
    this.onceListeners.delete(eventType);

    if (DEBUG.ENABLED) {
      console.log(`All listeners removed for: ${eventType}`);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - The event type to emit
   * @param {*} data - Data to pass to event listeners
   */
  emit(eventType, data = null) {
    if (!eventType || typeof eventType !== "string") {
      console.error(
        "EventBus.emit: Event type must be a non-empty string, received:",
        eventType
      );
      return 0;
    }

    // Store event in history for debugging
    this.addToHistory(eventType, data);

    let listenersNotified = 0;

    // Handle regular listeners
    if (this.listeners.has(eventType)) {
      const listeners = this.listeners.get(eventType).slice(); // Copy array to avoid issues with modifications during iteration

      for (const listener of listeners) {
        try {
          if (listener.context) {
            listener.callback.call(listener.context, data);
          } else {
            listener.callback(data);
          }
          listenersNotified++;
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
          // Continue executing other listeners even if one fails
        }
      }
    }

    // Handle once listeners
    if (this.onceListeners.has(eventType)) {
      const onceListeners = this.onceListeners.get(eventType).slice();

      for (const listener of onceListeners) {
        try {
          if (listener.context) {
            listener.callback.call(listener.context, data);
          } else {
            listener.callback(data);
          }
          listenersNotified++;
        } catch (error) {
          console.error(
            `Error in once event listener for ${eventType}:`,
            error
          );
        }
      }

      // Clear once listeners after execution
      this.onceListeners.delete(eventType);
    }

    if (DEBUG.ENABLED && DEBUG.LOG_LEVEL === "debug") {
      console.log(
        `Event emitted: ${eventType}, listeners notified: ${listenersNotified}`,
        data
      );
    }

    return listenersNotified;
  }

  /**
   * Emit an event asynchronously
   * @param {string} eventType - The event type to emit
   * @param {*} data - Data to pass to event listeners
   * @returns {Promise} Promise that resolves when all listeners have been called
   */
  async emitAsync(eventType, data = null) {
    return new Promise((resolve, reject) => {
      try {
        const listenersNotified = this.emit(eventType, data);
        resolve(listenersNotified);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if there are any listeners for an event
   * @param {string} eventType - The event type to check
   * @returns {boolean} True if there are listeners
   */
  hasListeners(eventType) {
    const hasRegular =
      this.listeners.has(eventType) && this.listeners.get(eventType).length > 0;
    const hasOnce =
      this.onceListeners.has(eventType) &&
      this.onceListeners.get(eventType).length > 0;
    return hasRegular || hasOnce;
  }

  /**
   * Get the number of listeners for an event
   * @param {string} eventType - The event type to check
   * @returns {number} Number of listeners
   */
  listenerCount(eventType) {
    let count = 0;
    if (this.listeners.has(eventType)) {
      count += this.listeners.get(eventType).length;
    }
    if (this.onceListeners.has(eventType)) {
      count += this.onceListeners.get(eventType).length;
    }
    return count;
  }

  /**
   * Get all event types that have listeners
   * @returns {string[]} Array of event types
   */
  getEventTypes() {
    const types = new Set();

    for (const type of this.listeners.keys()) {
      types.add(type);
    }

    for (const type of this.onceListeners.keys()) {
      types.add(type);
    }

    return Array.from(types);
  }

  /**
   * Add event to history for debugging
   * @param {string} eventType - The event type
   * @param {*} data - Event data
   */
  addToHistory(eventType, data) {
    if (!DEBUG.ENABLED) return;

    this.eventHistory.push({
      type: eventType,
      data: data,
      timestamp: Date.now(),
    });

    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history for debugging
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Array of recent events
   */
  getHistory(limit = 50) {
    if (!DEBUG.ENABLED) {
      console.warn("Event history only available in debug mode");
      return [];
    }

    return this.eventHistory.slice(-limit).map((event) => ({
      ...event,
      timeAgo: Date.now() - event.timestamp,
    }));
  }

  /**
   * Clear all listeners and history
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
    this.eventHistory.length = 0;

    if (DEBUG.ENABLED) {
      console.log("EventBus cleared");
    }
  }

  /**
   * Create a namespaced event emitter
   * @param {string} namespace - Namespace prefix for events
   * @returns {Object} Namespaced event emitter
   */
  namespace(namespace) {
    return {
      on: (eventType, callback, context) =>
        this.on(`${namespace}:${eventType}`, callback, context),
      once: (eventType, callback, context) =>
        this.once(`${namespace}:${eventType}`, callback, context),
      off: (eventType, callback) =>
        this.off(`${namespace}:${eventType}`, callback),
      emit: (eventType, data) => this.emit(`${namespace}:${eventType}`, data),
      emitAsync: (eventType, data) =>
        this.emitAsync(`${namespace}:${eventType}`, data),
    };
  }

  /**
   * Wait for a specific event to be emitted
   * @param {string} eventType - The event type to wait for
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise} Promise that resolves with event data
   */
  waitFor(eventType, timeout = null) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const cleanup = this.once(eventType, (data) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(data);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }

  /**
   * Create a filtered event listener that only triggers on specific conditions
   * @param {string} eventType - The event type to listen for
   * @param {Function} filter - Filter function that returns true/false
   * @param {Function} callback - Callback to execute when filter passes
   * @param {Object} context - Optional context
   * @returns {Function} Unsubscribe function
   */
  onWhen(eventType, filter, callback, context = null) {
    return this.on(eventType, (data) => {
      if (filter(data)) {
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
        }
      }
    });
  }
}

// Create global event bus instance
const eventBus = new EventBus();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EventBus, eventBus };
}

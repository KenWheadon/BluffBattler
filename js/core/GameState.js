/**
 * Bluff Battle - Game State Manager
 * Manages game state transitions and persistence
 */

class GameState {
  constructor() {
    this.state = GAME_STATES.MENU;
    this.previousState = null;
    this.stateHistory = [];
    this.stateData = {};
    this.listeners = new Map();

    if (DEBUG.ENABLED) {
      console.log("GameState manager initialized");
    }
  }

  /**
   * Get current game state
   * @returns {string} Current state
   */
  getCurrentState() {
    return this.state;
  }

  /**
   * Get previous game state
   * @returns {string|null} Previous state
   */
  getPreviousState() {
    return this.previousState;
  }

  /**
   * Change game state
   * @param {string} newState - New state to transition to
   * @param {Object} data - Optional data to pass with state change
   * @returns {boolean} True if state change was successful
   */
  changeState(newState, data = {}) {
    if (!Object.values(GAME_STATES).includes(newState)) {
      console.error(`Invalid game state: ${newState}`);
      return false;
    }

    // Check if state change is valid
    if (!this.isValidStateTransition(this.state, newState)) {
      console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
      return false;
    }

    const oldState = this.state;
    this.previousState = oldState;
    this.state = newState;

    // Store state data
    this.stateData[newState] = { ...data, timestamp: Date.now() };

    // Add to history
    this.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      data: data,
    });

    // Keep history size manageable
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    if (DEBUG.ENABLED) {
      console.log(`State changed: ${oldState} -> ${newState}`, data);
    }

    // Notify listeners
    this.notifyListeners(oldState, newState, data);

    // Emit event
    eventBus.emit(EVENTS.PHASE_CHANGE, {
      oldState: oldState,
      newState: newState,
      data: data,
    });

    return true;
  }

  /**
   * Check if a state transition is valid
   * @param {string} fromState - Current state
   * @param {string} toState - Target state
   * @returns {boolean} True if transition is valid
   */
  isValidStateTransition(fromState, toState) {
    // Define valid state transitions
    const validTransitions = {
      [GAME_STATES.MENU]: [GAME_STATES.LOADING, GAME_STATES.TUTORIAL],
      [GAME_STATES.LOADING]: [GAME_STATES.PLAYING, GAME_STATES.MENU],
      [GAME_STATES.PLAYING]: [
        GAME_STATES.PAUSED,
        GAME_STATES.ROUND_END,
        GAME_STATES.GAME_OVER,
        GAME_STATES.MENU,
      ],
      [GAME_STATES.PAUSED]: [GAME_STATES.PLAYING, GAME_STATES.MENU],
      [GAME_STATES.ROUND_END]: [
        GAME_STATES.PLAYING,
        GAME_STATES.GAME_OVER,
        GAME_STATES.MENU,
      ],
      [GAME_STATES.GAME_OVER]: [GAME_STATES.MENU, GAME_STATES.LOADING],
      [GAME_STATES.TUTORIAL]: [GAME_STATES.MENU, GAME_STATES.PLAYING],
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * Add a state change listener
   * @param {Function} callback - Callback function
   * @param {string} specificState - Optional specific state to listen for
   * @returns {Function} Unsubscribe function
   */
  addListener(callback, specificState = null) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    const listenerId = Date.now() + Math.random();
    this.listeners.set(listenerId, {
      callback: callback,
      state: specificState,
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Notify all listeners of state change
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {Object} data - State change data
   */
  notifyListeners(oldState, newState, data) {
    for (const [id, listener] of this.listeners.entries()) {
      try {
        // Call listener if it's for all states or specific state matches
        if (!listener.state || listener.state === newState) {
          listener.callback(oldState, newState, data);
        }
      } catch (error) {
        console.error(`Error in state listener ${id}:`, error);
      }
    }
  }

  /**
   * Get data associated with current state
   * @param {string} key - Specific data key (optional)
   * @returns {*} State data
   */
  getStateData(key = null) {
    const currentData = this.stateData[this.state] || {};
    return key ? currentData[key] : currentData;
  }

  /**
   * Set data for current state
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  setStateData(key, value) {
    if (!this.stateData[this.state]) {
      this.stateData[this.state] = {};
    }
    this.stateData[this.state][key] = value;
  }

  /**
   * Check if currently in a specific state
   * @param {string} state - State to check
   * @returns {boolean} True if in specified state
   */
  isInState(state) {
    return this.state === state;
  }

  /**
   * Check if game is currently active (playing or paused)
   * @returns {boolean} True if game is active
   */
  isGameActive() {
    return (
      this.state === GAME_STATES.PLAYING ||
      this.state === GAME_STATES.PAUSED ||
      this.state === GAME_STATES.ROUND_END
    );
  }

  /**
   * Check if game can be paused
   * @returns {boolean} True if game can be paused
   */
  canPause() {
    return this.state === GAME_STATES.PLAYING;
  }

  /**
   * Check if game can be resumed
   * @returns {boolean} True if game can be resumed
   */
  canResume() {
    return this.state === GAME_STATES.PAUSED;
  }

  /**
   * Get state history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} State history
   */
  getHistory(limit = 10) {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Revert to previous state (if valid)
   * @returns {boolean} True if revert was successful
   */
  revertToPreviousState() {
    if (!this.previousState) {
      console.warn("No previous state to revert to");
      return false;
    }

    return this.changeState(this.previousState, {
      isRevert: true,
      revertFrom: this.state,
    });
  }

  /**
   * Force state change (bypasses validation)
   * @param {string} newState - New state
   * @param {Object} data - State data
   * @returns {boolean} True if successful
   */
  forceState(newState, data = {}) {
    if (!Object.values(GAME_STATES).includes(newState)) {
      console.error(`Invalid game state: ${newState}`);
      return false;
    }

    const oldState = this.state;
    this.previousState = oldState;
    this.state = newState;
    this.stateData[newState] = { ...data, timestamp: Date.now(), forced: true };

    if (DEBUG.ENABLED) {
      console.warn(`Forced state change: ${oldState} -> ${newState}`, data);
    }

    this.notifyListeners(oldState, newState, data);
    return true;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const oldState = this.state;
    this.state = GAME_STATES.MENU;
    this.previousState = null;
    this.stateHistory = [];
    this.stateData = {};

    if (DEBUG.ENABLED) {
      console.log(`GameState reset from ${oldState} to ${this.state}`);
    }

    this.notifyListeners(oldState, this.state, { isReset: true });
  }

  /**
   * Get time spent in current state
   * @returns {number} Time in milliseconds
   */
  getTimeInCurrentState() {
    const stateData = this.stateData[this.state];
    if (!stateData || !stateData.timestamp) {
      return 0;
    }
    return Date.now() - stateData.timestamp;
  }

  /**
   * Get total time spent in a specific state
   * @param {string} state - State to check
   * @returns {number} Total time in milliseconds
   */
  getTotalTimeInState(state) {
    let totalTime = 0;
    let currentStart = null;

    for (const entry of this.stateHistory) {
      if (entry.to === state) {
        currentStart = entry.timestamp;
      } else if (entry.from === state && currentStart) {
        totalTime += entry.timestamp - currentStart;
        currentStart = null;
      }
    }

    // Add current time if still in the state
    if (this.state === state && currentStart) {
      totalTime += Date.now() - currentStart;
    }

    return totalTime;
  }

  /**
   * Serialize state for saving
   * @returns {Object} Serialized state data
   */
  serialize() {
    return {
      currentState: this.state,
      previousState: this.previousState,
      stateData: this.stateData,
      history: this.stateHistory.slice(-10), // Keep only recent history
      timestamp: Date.now(),
    };
  }

  /**
   * Deserialize state from saved data
   * @param {Object} data - Serialized state data
   * @returns {boolean} True if successful
   */
  deserialize(data) {
    try {
      if (!data || typeof data !== "object") {
        throw new Error("Invalid state data");
      }

      this.state = data.currentState || GAME_STATES.MENU;
      this.previousState = data.previousState || null;
      this.stateData = data.stateData || {};
      this.stateHistory = data.history || [];

      if (DEBUG.ENABLED) {
        console.log("GameState deserialized:", this.state);
      }

      return true;
    } catch (error) {
      console.error("Failed to deserialize game state:", error);
      this.reset();
      return false;
    }
  }

  /**
   * Get state statistics
   * @returns {Object} State statistics
   */
  getStatistics() {
    const stats = {
      currentState: this.state,
      timeInCurrentState: this.getTimeInCurrentState(),
      totalStateChanges: this.stateHistory.length,
      stateFrequency: {},
      averageStateTime: 0,
    };

    // Calculate state frequency and times
    for (const state of Object.values(GAME_STATES)) {
      const entries = this.stateHistory.filter((h) => h.to === state);
      stats.stateFrequency[state] = entries.length;
    }

    // Calculate average state time
    if (this.stateHistory.length > 1) {
      let totalTime = 0;
      for (let i = 1; i < this.stateHistory.length; i++) {
        totalTime +=
          this.stateHistory[i].timestamp - this.stateHistory[i - 1].timestamp;
      }
      stats.averageStateTime = totalTime / (this.stateHistory.length - 1);
    }

    return stats;
  }

  /**
   * Validate current state consistency
   * @returns {boolean} True if state is valid
   */
  validate() {
    // Check if current state is valid
    if (!Object.values(GAME_STATES).includes(this.state)) {
      console.error(`Invalid current state: ${this.state}`);
      return false;
    }

    // Check if previous state is valid (if set)
    if (
      this.previousState &&
      !Object.values(GAME_STATES).includes(this.previousState)
    ) {
      console.error(`Invalid previous state: ${this.previousState}`);
      return false;
    }

    // Validate state data structure
    if (typeof this.stateData !== "object") {
      console.error("State data must be an object");
      return false;
    }

    // Validate history structure
    if (!Array.isArray(this.stateHistory)) {
      console.error("State history must be an array");
      return false;
    }

    return true;
  }

  /**
   * Clear all listeners
   */
  clearListeners() {
    this.listeners.clear();
    if (DEBUG.ENABLED) {
      console.log("All state listeners cleared");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GameState;
}

/**
 * Bluff Battle - Log Renderer
 * Handles game log display and message management
 */

class LogRenderer {
  constructor(logElement) {
    this.logElement = logElement;
    this.messages = [];
    this.maxMessages = 100;
    this.autoScroll = true;
    this.filters = new Set(["all"]);
    this.pauseOnHover = true;

    if (DEBUG.ENABLED) {
      console.log("LogRenderer initialized");
    }
  }

  /**
   * Initialize the log renderer
   */
  initialize() {
    if (!this.logElement) {
      throw new Error("Log element is required");
    }

    this.setupEventListeners();
    this.createLogControls();
    this.render();

    if (DEBUG.ENABLED) {
      console.log("LogRenderer initialization complete");
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for various game events to log
    this.setupGameEventListeners();

    // Handle log element hover for auto-scroll pause
    if (this.pauseOnHover) {
      this.logElement.addEventListener("mouseenter", () => {
        this.autoScroll = false;
      });

      this.logElement.addEventListener("mouseleave", () => {
        this.autoScroll = true;
        this.scrollToBottom();
      });
    }
  }

  /**
   * Setup game event listeners
   */
  setupGameEventListeners() {
    // Game flow events
    eventBus.on(EVENTS.GAME_START, (data) => {
      this.addMessage("🎮 Game started! Good luck!", "game", "highlight");
    });

    eventBus.on(EVENTS.GAME_END, (data) => {
      const winner = data.winner.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
      this.addMessage(`🏆 Game over! ${winner} wins!`, "game", "highlight");
    });

    eventBus.on(EVENTS.ROUND_START, (data) => {
      this.addMessage(`⚔️ Round ${data.roundNumber} begins`, "round", "info");
    });

    eventBus.on(EVENTS.ROUND_END, (data) => {
      const message = data.winner
        ? `🏁 Round ${data.roundNumber} complete - ${data.winner.name} leads!`
        : `🏁 Round ${data.roundNumber} complete - Tied!`;
      this.addMessage(message, "round", "info");
    });

    // Turn events
    eventBus.on(EVENTS.TURN_START, (data) => {
      const playerName =
        data.player.type === PLAYER_TYPES.HUMAN ? "Your" : "AI's";
      this.addMessage(`${playerName} turn`, "turn", "normal");
    });

    // Play events
    eventBus.on(EVENTS.PLAY_CONFIRMED, (data) => {
      if (!data || !data.player) return;

      const playerName = data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
      const cardName = data.claimedType
        ? CARD_INFO[data.claimedType].name
        : "Unknown";
      const position = data.position !== undefined ? data.position : "?";

      this.addMessage(
        `${playerName} played ${cardName} ${
          CARD_INFO[data.claimedType]?.icon || ""
        } at position ${position}`,
        "play",
        "action"
      );
    });

    // Challenge events
    eventBus.on(EVENTS.CHALLENGE_MADE, (data) => {
      const challengerName =
        data.challenger.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
      const resultText = data.result?.explanation || "Challenge result unknown";
      this.addMessage(
        `⚡ ${challengerName} challenged: ${resultText}`,
        "challenge",
        "challenge"
      );
    });

    eventBus.on(EVENTS.CHALLENGE_WINDOW_OPEN, (data) => {
      if (data.play?.player?.type === PLAYER_TYPES.AI) {
        this.addMessage(
          "💭 Challenge opportunity - Click Challenge if you think AI is bluffing!",
          "challenge",
          "opportunity"
        );
      }
    });

    // Battle events
    eventBus.on(EVENTS.BATTLE_START, (data) => {
      this.addMessage("⚔️ Battle phase started", "battle", "battle");
    });

    eventBus.on(EVENTS.BATTLE_RESULT, (data) => {
      if (data.explanation) {
        this.addMessage(`⚔️ ${data.explanation}`, "battle", "battle");
      }
    });

    eventBus.on(EVENTS.BATTLE_END, (data) => {
      this.addMessage(
        `⚔️ Battle phase complete - ${
          data.results?.length || 0
        } battles resolved`,
        "battle",
        "battle"
      );
    });

    // Score events
    eventBus.on(EVENTS.SCORE_UPDATE, (data) => {
      if (data.pointsAdded > 0) {
        const playerName =
          data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
        this.addMessage(
          `🎯 ${playerName} scored ${data.pointsAdded} point${
            data.pointsAdded === 1 ? "" : "s"
          }! (${data.newScore} total)`,
          "score",
          "score"
        );
      } else if (data.pointsAdded < 0) {
        const playerName =
          data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
        this.addMessage(
          `💔 ${playerName} lost ${Math.abs(data.pointsAdded)} point${
            Math.abs(data.pointsAdded) === 1 ? "" : "s"
          } (${data.newScore} total)`,
          "score",
          "penalty"
        );
      }
    });

    eventBus.on(EVENTS.POINTS_AWARDED, (data) => {
      const playerName = data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
      const reason = this.formatScoreReason(data.reason);
      this.addMessage(
        `🎯 ${playerName} earned ${data.totalPoints} points for ${reason}`,
        "score",
        "score"
      );
    });

    // Error events
    eventBus.on(EVENTS.ERROR, (data) => {
      this.addMessage(
        `❌ Error: ${data.error?.message || "Unknown error"}`,
        "error",
        "error"
      );
    });

    // Custom log message event
    eventBus.on("log_message", (data) => {
      this.addMessage(
        data.message,
        data.category || "general",
        data.type || "normal"
      );
    });

    // Achievement events
    eventBus.on("achievement_unlocked", (data) => {
      this.addMessage(
        `🏆 Achievement Unlocked: ${data.name} - ${data.description}`,
        "achievement",
        "achievement"
      );
    });
  }

  /**
   * Format score reason for display
   * @param {string} reason - Raw score reason
   * @returns {string} Formatted reason
   */
  formatScoreReason(reason) {
    const reasonMap = {
      battle_win: "winning battle",
      advancement: "advancement",
      control: "controlling territory",
      challenge_success: "successful challenge",
      bluff_success: "successful bluff",
    };

    return reasonMap[reason] || reason;
  }

  /**
   * Add a message to the log
   * @param {string} message - Message text
   * @param {string} category - Message category for filtering
   * @param {string} type - Message type for styling
   */
  addMessage(message, category = "general", type = "normal") {
    const logMessage = {
      id: Date.now() + Math.random(),
      text: message,
      category: category,
      type: type,
      timestamp: Date.now(),
      displayed: false,
    };

    this.messages.push(logMessage);

    // Keep messages within limit
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    // Render new message if it passes filters
    if (this.shouldShowMessage(logMessage)) {
      this.renderMessage(logMessage);

      if (this.autoScroll) {
        this.scrollToBottom();
      }
    }

    if (DEBUG.ENABLED) {
      console.log(`Log message added: [${category}] ${message}`);
    }
  }

  /**
   * Check if message should be shown based on filters
   * @param {Object} message - Message to check
   * @returns {boolean} True if should be shown
   */
  shouldShowMessage(message) {
    return this.filters.has("all") || this.filters.has(message.category);
  }

  /**
   * Render a single message
   * @param {Object} message - Message to render
   */
  renderMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = `log-entry log-${message.type}`;
    messageElement.dataset.category = message.category;
    messageElement.dataset.messageId = message.id;

    // Create timestamp
    const timestamp = document.createElement("span");
    timestamp.className = "log-timestamp";
    timestamp.textContent = this.formatTimestamp(message.timestamp);

    // Create message content
    const content = document.createElement("span");
    content.className = "log-content";
    content.textContent = message.text;

    messageElement.appendChild(timestamp);
    messageElement.appendChild(content);

    // Add to log
    this.logElement.appendChild(messageElement);
    message.displayed = true;

    // Animate in (if not skipping animations)
    if (!DEBUG.SKIP_ANIMATIONS) {
      messageElement.style.opacity = "0";
      messageElement.style.transform = "translateX(-20px)";

      setTimeout(() => {
        messageElement.style.transition = "all 0.3s ease";
        messageElement.style.opacity = "1";
        messageElement.style.transform = "translateX(0)";

        setTimeout(() => {
          messageElement.style.transition = "";
        }, 300);
      }, 10);
    }

    // Clean up old messages from DOM
    this.cleanupOldMessages();
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Timestamp to format
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    // If same day, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  }

  /**
   * Clean up old message elements from DOM
   */
  cleanupOldMessages() {
    const messageElements = this.logElement.children;

    // Keep only the most recent messages in DOM
    while (messageElements.length > 50) {
      messageElements[0].remove();
    }
  }

  /**
   * Render all messages (full re-render)
   */
  render() {
    this.logElement.innerHTML = "";

    const visibleMessages = this.messages.filter((msg) =>
      this.shouldShowMessage(msg)
    );
    const recentMessages = visibleMessages.slice(-50); // Show only recent 50

    for (const message of recentMessages) {
      message.displayed = false; // Reset display state
      this.renderMessage(message);
    }

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Create log controls (filters, clear, etc.)
   */
  createLogControls() {
    const existingControls =
      this.logElement.parentElement.querySelector(".log-controls");
    if (existingControls) {
      existingControls.remove();
    }

    const controls = document.createElement("div");
    controls.className = "log-controls";

    // Filter dropdown
    const filterSelect = document.createElement("select");
    filterSelect.className = "log-filter";
    filterSelect.innerHTML = `
      <option value="all">All Messages</option>
      <option value="game">Game Events</option>
      <option value="play">Player Actions</option>
      <option value="battle">Battles</option>
      <option value="challenge">Challenges</option>
      <option value="score">Scoring</option>
      <option value="error">Errors</option>
    `;

    filterSelect.addEventListener("change", (e) => {
      this.setFilter(e.target.value);
    });

    // Clear button
    const clearButton = document.createElement("button");
    clearButton.className = "log-clear-btn";
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", () => {
      this.clearLog();
    });

    // Export button (for debugging)
    if (DEBUG.ENABLED) {
      const exportButton = document.createElement("button");
      exportButton.className = "log-export-btn";
      exportButton.textContent = "Export";
      exportButton.addEventListener("click", () => {
        this.exportLog();
      });
      controls.appendChild(exportButton);
    }

    controls.appendChild(filterSelect);
    controls.appendChild(clearButton);

    // Insert controls before log element
    this.logElement.parentElement.insertBefore(controls, this.logElement);
  }

  /**
   * Set message filter
   * @param {string} filter - Filter to apply
   */
  setFilter(filter) {
    this.filters.clear();
    this.filters.add(filter);
    this.render();

    if (DEBUG.ENABLED) {
      console.log(`Log filter set to: ${filter}`);
    }
  }

  /**
   * Add multiple filters
   * @param {Array<string>} filters - Filters to add
   */
  addFilters(filters) {
    for (const filter of filters) {
      this.filters.add(filter);
    }
    this.render();
  }

  /**
   * Clear the log
   */
  clearLog() {
    this.messages = [];
    this.logElement.innerHTML = "";
    this.addMessage("📝 Log cleared", "system", "info");
  }

  /**
   * Scroll to bottom of log
   */
  scrollToBottom() {
    if (this.logElement) {
      this.logElement.scrollTop = this.logElement.scrollHeight;
    }
  }

  /**
   * Search messages
   * @param {string} query - Search query
   * @returns {Array} Matching messages
   */
  searchMessages(query) {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter((message) =>
      message.text.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Highlight search results
   * @param {string} query - Search query
   */
  highlightSearch(query) {
    const messageElements = this.logElement.querySelectorAll(".log-entry");

    for (const element of messageElements) {
      const content = element.querySelector(".log-content");
      if (content) {
        let text = content.textContent;

        if (query && query.length > 0) {
          const regex = new RegExp(`(${query})`, "gi");
          text = text.replace(regex, "<mark>$1</mark>");
        }

        content.innerHTML = text;
      }
    }
  }

  /**
   * Get message statistics
   * @returns {Object} Message statistics
   */
  getStatistics() {
    const stats = {
      totalMessages: this.messages.length,
      categories: {},
      types: {},
      messagesPerMinute: 0,
      oldestMessage: null,
      newestMessage: null,
    };

    if (this.messages.length === 0) {
      return stats;
    }

    // Count by category and type
    for (const message of this.messages) {
      stats.categories[message.category] =
        (stats.categories[message.category] || 0) + 1;
      stats.types[message.type] = (stats.types[message.type] || 0) + 1;
    }

    // Calculate messages per minute
    stats.oldestMessage = this.messages[0].timestamp;
    stats.newestMessage = this.messages[this.messages.length - 1].timestamp;

    const durationMinutes = (stats.newestMessage - stats.oldestMessage) / 60000;
    if (durationMinutes > 0) {
      stats.messagesPerMinute = this.messages.length / durationMinutes;
    }

    return stats;
  }

  /**
   * Export log data
   * @returns {string} Exported log data
   */
  exportLog() {
    const exportData = {
      messages: this.messages,
      statistics: this.getStatistics(),
      exportedAt: Date.now(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);

    // Create download link
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `bluff-battle-log-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    this.addMessage("📄 Log exported", "system", "info");

    return dataStr;
  }

  /**
   * Import log data
   * @param {string} jsonData - JSON log data
   */
  importLog(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (data.messages && Array.isArray(data.messages)) {
        this.messages = data.messages;
        this.render();
        this.addMessage("📥 Log imported", "system", "info");
      } else {
        throw new Error("Invalid log data format");
      }
    } catch (error) {
      this.addMessage(
        `❌ Failed to import log: ${error.message}`,
        "error",
        "error"
      );
    }
  }

  /**
   * Add batch of messages (for performance)
   * @param {Array} messages - Messages to add
   */
  addMessages(messages) {
    for (const msg of messages) {
      this.messages.push({
        id: Date.now() + Math.random(),
        text: msg.text || msg,
        category: msg.category || "general",
        type: msg.type || "normal",
        timestamp: msg.timestamp || Date.now(),
        displayed: false,
      });
    }

    // Keep within limit
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.render();
  }

  /**
   * Validate renderer state
   * @returns {boolean} True if valid
   */
  validate() {
    if (!this.logElement) {
      console.error("LogRenderer: Missing log element");
      return false;
    }

    if (!Array.isArray(this.messages)) {
      console.error("LogRenderer: Messages must be an array");
      return false;
    }

    return true;
  }

  /**
   * Clean up renderer
   */
  destroy() {
    // Clear messages
    this.messages = [];

    // Clear DOM
    if (this.logElement) {
      this.logElement.innerHTML = "";
    }

    // Clear controls
    const controls =
      this.logElement?.parentElement?.querySelector(".log-controls");
    if (controls) {
      controls.remove();
    }

    if (DEBUG.ENABLED) {
      console.log("LogRenderer destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = LogRenderer;
}

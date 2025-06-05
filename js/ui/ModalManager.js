/**
 * Bluff Battle - Modal Manager
 * Handles all modal dialogs and overlays
 */

class ModalManager {
  constructor(modalOverlay, modalContent) {
    this.modalOverlay = modalOverlay;
    this.modalContent = modalContent;
    this.currentModal = null;
    this.modalHistory = [];
    this.isOpen = false;

    if (DEBUG.ENABLED) {
      console.log("ModalManager initialized");
    }
  }

  /**
   * Initialize modal manager
   */
  async initialize() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.hideModal();
      }
    });

    // Handle modal events
    eventBus.on("show_modal", (data) => {
      this.showModal(data.title, data.content, data.options);
    });

    eventBus.on("hide_modal", () => {
      this.hideModal();
    });
  }

  /**
   * Show a modal with content
   * @param {string} title - Modal title
   * @param {string} content - Modal content (HTML)
   * @param {Object} options - Modal options
   */
  showModal(title, content, options = {}) {
    if (!this.modalOverlay || !this.modalContent) return;

    const modalData = {
      title,
      content,
      options: {
        closable: true,
        showCloseButton: true,
        className: "",
        ...options,
      },
    };

    this.currentModal = modalData;
    this.modalHistory.push(modalData);

    // Build modal HTML
    const modalHTML = this.buildModalHTML(modalData);
    this.modalContent.innerHTML = modalHTML;

    // Apply custom class if provided
    if (modalData.options.className) {
      this.modalContent.className = `modal-content ${modalData.options.className}`;
    } else {
      this.modalContent.className = "modal-content";
    }

    // Show the modal
    this.modalOverlay.classList.remove("hidden");
    this.isOpen = true;

    // Focus management
    this.trapFocus();

    // Emit event
    eventBus.emit(EVENTS.MODAL_SHOW, { modal: modalData });

    if (DEBUG.ENABLED) {
      console.log("Modal shown:", title);
    }
  }

  /**
   * Build modal HTML structure
   * @param {Object} modalData - Modal data
   * @returns {string} Modal HTML
   */
  buildModalHTML(modalData) {
    const { title, content, options } = modalData;

    let html = "";

    // Modal header
    if (title) {
      html += `
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          ${
            options.showCloseButton
              ? '<button class="modal-close-btn" onclick="modalManager.hideModal()">&times;</button>'
              : ""
          }
        </div>
      `;
    }

    // Modal body
    html += `<div class="modal-body">${content}</div>`;

    // Default close button if no custom buttons provided
    if (!content.includes("modal-actions") && options.closable) {
      html += `
        <div class="modal-actions">
          <button class="secondary-btn" onclick="modalManager.hideModal()">Close</button>
        </div>
      `;
    }

    return html;
  }

  /**
   * Hide the current modal
   */
  hideModal() {
    if (!this.isOpen) return;

    if (this.modalOverlay) {
      this.modalOverlay.classList.add("hidden");
    }

    this.isOpen = false;
    this.currentModal = null;

    // Remove focus trap
    this.removeFocusTrap();

    // Emit event
    eventBus.emit(EVENTS.MODAL_HIDE, {});

    if (DEBUG.ENABLED) {
      console.log("Modal hidden");
    }
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirm - Callback for confirm
   * @param {Function} onCancel - Callback for cancel
   */
  showConfirmDialog(title, message, onConfirm, onCancel) {
    const confirmId = `confirm_${Date.now()}`;
    const cancelId = `cancel_${Date.now()}`;

    const content = `
      <div class="confirm-dialog">
        <p class="confirm-message">${message}</p>
        <div class="modal-actions">
          <button id="${confirmId}" class="primary-btn">Confirm</button>
          <button id="${cancelId}" class="secondary-btn">Cancel</button>
        </div>
      </div>
    `;

    this.showModal(title, content, { className: "confirm-modal" });

    // Add event listeners after modal is shown
    setTimeout(() => {
      const confirmBtn = document.getElementById(confirmId);
      const cancelBtn = document.getElementById(cancelId);

      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          this.hideModal();
          if (onConfirm) onConfirm();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          this.hideModal();
          if (onCancel) onCancel();
        });
      }
    }, 10);
  }

  /**
   * Show alert dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onClose - Callback when closed
   */
  showAlert(title, message, onClose) {
    const content = `
      <div class="alert-dialog">
        <p class="alert-message">${message}</p>
        <div class="modal-actions">
          <button class="primary-btn" onclick="modalManager.hideModal()">OK</button>
        </div>
      </div>
    `;

    this.showModal(title, content, { className: "alert-modal" });

    if (onClose) {
      const closeHandler = () => {
        onClose();
        eventBus.off(EVENTS.MODAL_HIDE, closeHandler);
      };
      eventBus.on(EVENTS.MODAL_HIDE, closeHandler);
    }
  }

  /**
   * Show game end modal
   * @param {Object} gameData - Game end data
   */
  showGameEndModal(gameData) {
    const winnerName =
      gameData.winner.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
    const isPlayerWinner = gameData.winner.type === PLAYER_TYPES.HUMAN;

    const content = `
      <div class="game-end-content">
        <div class="winner-announcement ${
          isPlayerWinner ? "player-win" : "ai-win"
        }">
          ${isPlayerWinner ? "🎉 Congratulations! 🎉" : "💻 AI Wins! 💻"}
        </div>
        <div class="final-scores">
          <h3>Final Scores</h3>
          <div class="score-line">You: ${gameData.finalScores.human}</div>
          <div class="score-line">AI: ${gameData.finalScores.ai}</div>
        </div>
        <div class="game-stats">
          <p>Rounds Played: ${gameData.roundsPlayed}</p>
          <p>Total Moves: ${gameData.totalMoves}</p>
          <p>Game Duration: ${Math.round(gameData.gameDuration / 1000)}s</p>
        </div>
        <div class="modal-actions">
          <button class="primary-btn" onclick="location.reload()">New Game</button>
          <button class="secondary-btn" onclick="modalManager.hideModal()">Close</button>
        </div>
      </div>
    `;

    this.showModal("Game Over", content, {
      className: "game-end-modal",
      closable: false, // Force player to choose action
    });
  }

  /**
   * Show loading modal
   * @param {string} message - Loading message
   */
  showLoadingModal(message = "Loading...") {
    const content = `
      <div class="loading-modal">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;

    this.showModal("", content, {
      className: "loading-modal",
      closable: false,
      showCloseButton: false,
    });
  }

  /**
   * Show achievement notification modal
   * @param {Object} achievement - Achievement data
   */
  showAchievementModal(achievement) {
    const content = `
      <div class="achievement-modal">
        <div class="achievement-icon">🏆</div>
        <h3 class="achievement-title">${achievement.name}</h3>
        <p class="achievement-description">${achievement.description}</p>
        <div class="modal-actions">
          <button class="primary-btn" onclick="modalManager.hideModal()">Awesome!</button>
        </div>
      </div>
    `;

    this.showModal("Achievement Unlocked!", content, {
      className: "achievement-modal",
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (
        this.isOpen &&
        this.currentModal?.options?.className === "achievement-modal"
      ) {
        this.hideModal();
      }
    }, 5000);
  }

  /**
   * Show card inspector modal
   * @param {Card} card - Card to inspect
   */
  showCardInspector(card) {
    const content = `
      <div class="card-inspector">
        <div class="card-header">
          <span class="card-icon-large">${card.getIcon()}</span>
          <h3>${card.getName()}</h3>
        </div>
        <div class="card-properties">
          <div class="property">
            <strong>ID:</strong> ${card.id}
          </div>
          <div class="property">
            <strong>Type:</strong> ${card.type}
          </div>
          <div class="property">
            <strong>State:</strong> ${card.state}
          </div>
          <div class="property">
            <strong>Age:</strong> ${Math.round(card.getAge() / 1000)}s
          </div>
          <div class="property">
            <strong>Defeats:</strong> ${CARD_INFO[card.getDefeats()].name}
          </div>
          <div class="property">
            <strong>Defeated By:</strong> ${
              CARD_INFO[card.getDefeatedBy()].name
            }
          </div>
        </div>
        ${
          card.battleHistory.length > 0
            ? `
          <div class="battle-history">
            <h4>Recent Battles</h4>
            <ul>
              ${card.battleHistory
                .slice(-3)
                .map(
                  (battle) => `
                <li>${battle.result} vs ${
                    CARD_INFO[battle.opponentType].name
                  }</li>
              `
                )
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
        <div class="modal-actions">
          <button class="secondary-btn" onclick="modalManager.hideModal()">Close</button>
        </div>
      </div>
    `;

    this.showModal("Card Inspector", content, {
      className: "card-inspector-modal",
    });
  }

  /**
   * Show tutorial modal
   * @param {Object} tutorialStep - Tutorial step data
   */
  showTutorialModal(tutorialStep) {
    const content = `
      <div class="tutorial-modal">
        <div class="tutorial-content">
          <h3>${tutorialStep.title}</h3>
          <p>${tutorialStep.content}</p>
        </div>
        <div class="tutorial-navigation">
          <button id="tutorial-prev" class="secondary-btn" ${
            tutorialStep.isFirst ? "disabled" : ""
          }>Previous</button>
          <span class="tutorial-progress">${tutorialStep.current} of ${
      tutorialStep.total
    }</span>
          <button id="tutorial-next" class="primary-btn">${
            tutorialStep.isLast ? "Finish" : "Next"
          }</button>
        </div>
      </div>
    `;

    this.showModal("Tutorial", content, {
      className: "tutorial-modal",
      closable: false,
    });
  }

  /**
   * Trap focus within modal
   */
  trapFocus() {
    if (!this.modalContent) return;

    const focusableElements = this.modalContent.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    // Handle tab key
    this.focusTrapHandler = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", this.focusTrapHandler);
  }

  /**
   * Remove focus trap
   */
  removeFocusTrap() {
    if (this.focusTrapHandler) {
      document.removeEventListener("keydown", this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  /**
   * Check if modal is currently open
   * @returns {boolean} True if modal is open
   */
  isModalOpen() {
    return this.isOpen;
  }

  /**
   * Get current modal data
   * @returns {Object|null} Current modal data
   */
  getCurrentModal() {
    return this.currentModal;
  }

  /**
   * Get modal history
   * @param {number} limit - Maximum number of modals to return
   * @returns {Array} Modal history
   */
  getModalHistory(limit = 10) {
    return this.modalHistory.slice(-limit);
  }

  /**
   * Clear modal history
   */
  clearHistory() {
    this.modalHistory = [];
  }

  /**
   * Create notification toast (non-modal)
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = "info", duration = 3000) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Position notification
    const notifications = document.querySelectorAll(".notification");
    const offset = (notifications.length - 1) * 70;
    notification.style.top = `${20 + offset}px`;

    // Auto-remove after duration
    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, duration);

    // Manual close handler
    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });

    // Animate in
    setTimeout(() => {
      notification.classList.add("notification-show");
    }, 10);
  }

  /**
   * Remove a notification
   * @param {HTMLElement} notification - Notification element
   */
  removeNotification(notification) {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Validate modal manager state
   * @returns {boolean} True if valid
   */
  validate() {
    if (!this.modalOverlay || !this.modalContent) {
      console.error("ModalManager: Missing modal elements");
      return false;
    }

    return true;
  }

  /**
   * Clean up modal manager
   */
  destroy() {
    // Hide any open modal
    this.hideModal();

    // Remove focus trap
    this.removeFocusTrap();

    // Clear history
    this.clearHistory();

    // Remove any notifications
    const notifications = document.querySelectorAll(".notification");
    notifications.forEach((notification) => {
      this.removeNotification(notification);
    });

    if (DEBUG.ENABLED) {
      console.log("ModalManager destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ModalManager;
}

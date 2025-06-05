/**
 * Bluff Battle - Input Handler
 * Manages all user input interactions and delegates to game systems
 */

class InputHandler {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.game = uiManager.game;
    this.elements = uiManager.elements;

    // Interaction state
    this.selectedCardElement = null;
    this.selectedPositionElement = null;
    this.hoveredElements = new Set();

    if (DEBUG.ENABLED) {
      console.log("InputHandler initialized");
    }
  }

  /**
   * Initialize input handling
   */
  async initialize() {
    this.setupActionButtonListeners();
    this.setupControlButtonListeners();
    this.setupKeyboardListeners();
    this.setupGameEventListeners();
    this.setupModalListeners();
  }

  /**
   * Setup action button event listeners
   */
  setupActionButtonListeners() {
    // Claim button listeners
    if (this.elements.claimRock) {
      this.elements.claimRock.addEventListener("click", () => {
        this.handleClaimSelection(CARD_TYPES.ROCK);
      });
    }

    if (this.elements.claimPaper) {
      this.elements.claimPaper.addEventListener("click", () => {
        this.handleClaimSelection(CARD_TYPES.PAPER);
      });
    }

    if (this.elements.claimScissors) {
      this.elements.claimScissors.addEventListener("click", () => {
        this.handleClaimSelection(CARD_TYPES.SCISSORS);
      });
    }

    // Action button listeners
    if (this.elements.confirmPlay) {
      this.elements.confirmPlay.addEventListener("click", () => {
        this.handlePlayConfirmation();
      });
    }

    if (this.elements.cancelPlay) {
      this.elements.cancelPlay.addEventListener("click", () => {
        this.handlePlayCancellation();
      });
    }

    if (this.elements.challengeBtn) {
      this.elements.challengeBtn.addEventListener("click", () => {
        this.handleChallenge();
      });
    }
  }

  /**
   * Setup control button listeners
   */
  setupControlButtonListeners() {
    if (this.elements.pauseBtn) {
      this.elements.pauseBtn.addEventListener("click", () => {
        this.handlePauseToggle();
      });
    }

    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener("click", () => {
        this.showSettingsModal();
      });
    }
  }

  /**
   * Setup keyboard event listeners
   */
  setupKeyboardListeners() {
    document.addEventListener("keydown", (e) => {
      this.handleKeyPress(e);
    });
  }

  /**
   * Setup game event listeners for input handling
   */
  setupGameEventListeners() {
    // UI interaction events
    eventBus.on("ui:card_selected", (data) => {
      this.handleCardSelection(data.card);
    });

    eventBus.on("ui:position_selected", (data) => {
      this.handlePositionSelection(data.position);
    });

    eventBus.on("ui:claim_selected", (data) => {
      this.handleClaimSelection(data.claimedType);
    });

    eventBus.on("ui:play_confirmed", () => {
      this.handlePlayConfirmation();
    });

    eventBus.on("ui:play_cancelled", () => {
      this.handlePlayCancellation();
    });

    eventBus.on("ui:challenge_made", () => {
      this.handleChallenge();
    });
  }

  /**
   * Setup modal-related listeners
   */
  setupModalListeners() {
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.addEventListener("click", (e) => {
        if (e.target === this.elements.modalOverlay) {
          this.uiManager.modalManager?.hideModal();
        }
      });
    }
  }

  /**
   * Handle card selection
   */
  handleCardSelection(card) {
    if (
      this.game.currentPlayer?.type !== PLAYER_TYPES.HUMAN ||
      this.game.turnPhase !== TURN_PHASES.PLACEMENT
    ) {
      return false;
    }

    // Clear previous selection
    this.clearCardSelection();

    // Send to game controller
    const success = this.game.handlePlayerAction(PLAYER_ACTIONS.SELECT_CARD, {
      card,
    });

    if (success) {
      // Update visual selection
      const cardElement = this.findCardElement(card.id);
      if (cardElement) {
        cardElement.classList.add("selected");
        this.selectedCardElement = cardElement;
      }

      this.uiManager.updateUI();
    }

    return success;
  }

  /**
   * Handle position selection
   */
  handlePositionSelection(position) {
    if (
      this.game.currentPlayer?.type !== PLAYER_TYPES.HUMAN ||
      !this.game.selectedCard
    ) {
      return false;
    }

    // Clear previous position selection
    this.clearPositionSelection();

    // Send to game controller
    const success = this.game.handlePlayerAction(
      PLAYER_ACTIONS.SELECT_POSITION,
      { position }
    );

    if (success) {
      // Update visual selection
      const positionElement = this.elements.gameGrid?.children[position];
      if (positionElement) {
        positionElement.classList.add("selected");
        this.selectedPositionElement = positionElement;
      }

      this.uiManager.updateUI();
    }

    return success;
  }

  /**
   * Handle claim selection
   */
  handleClaimSelection(claimedType) {
    if (
      this.game.currentPlayer?.type !== PLAYER_TYPES.HUMAN ||
      !this.game.selectedCard
    ) {
      return false;
    }

    const success = this.game.handlePlayerAction(PLAYER_ACTIONS.MAKE_CLAIM, {
      claimedType,
    });

    if (success) {
      this.uiManager.updateUI();
    }

    return success;
  }

  /**
   * Handle play confirmation
   */
  handlePlayConfirmation() {
    if (
      this.game.currentPlayer?.type !== PLAYER_TYPES.HUMAN ||
      !this.game.selectedCard ||
      this.game.selectedPosition === null ||
      !this.game.pendingClaim
    ) {
      return false;
    }

    const success = this.game.handlePlayerAction(
      PLAYER_ACTIONS.CONFIRM_PLAY,
      {}
    );

    if (success) {
      this.clearSelections();
      this.uiManager.updateUI();
    }

    return success;
  }

  /**
   * Handle play cancellation
   */
  handlePlayCancellation() {
    const success = this.game.handlePlayerAction(
      PLAYER_ACTIONS.CANCEL_PLAY,
      {}
    );

    if (success) {
      this.clearSelections();
      this.uiManager.updateUI();
    }

    return success;
  }

  /**
   * Handle challenge attempt
   */
  handleChallenge() {
    if (DEBUG.ENABLED) {
      console.log("Challenge button clicked");
    }

    const success = this.game.handlePlayerAction(
      PLAYER_ACTIONS.CHALLENGE_CLAIM,
      {}
    );

    if (success) {
      this.uiManager.addLogMessage(
        "🎯 You challenged the AI's claim!",
        "action"
      );
    }

    return success;
  }

  /**
   * Handle pause/resume toggle
   */
  handlePauseToggle() {
    if (this.game) {
      if (this.game.isPaused) {
        this.game.resumeGame();
      } else {
        this.game.pauseGame();
      }
    }
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(event) {
    // Don't handle shortcuts when typing in inputs
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.key) {
      case "Escape":
        this.handlePlayCancellation();
        this.uiManager.modalManager?.hideModal();
        break;

      case "Enter":
        if (!this.elements.confirmPlay?.disabled) {
          this.handlePlayConfirmation();
        }
        break;

      case " ":
        if (
          this.elements.challengeBtn &&
          !this.elements.challengeBtn.disabled &&
          this.elements.challengeBtn.style.display !== "none"
        ) {
          event.preventDefault();
          this.handleChallenge();
        }
        break;

      case "p":
      case "P":
        this.handlePauseToggle();
        break;

      case "n":
      case "N":
        if (event.ctrlKey) {
          this.uiManager.startNewGame();
        }
        break;

      case "h":
      case "H":
        if (event.ctrlKey) {
          this.showHowToPlay();
        }
        break;

      case "1":
        event.preventDefault();
        this.handleClaimSelection(CARD_TYPES.ROCK);
        break;

      case "2":
        event.preventDefault();
        this.handleClaimSelection(CARD_TYPES.PAPER);
        break;

      case "3":
        event.preventDefault();
        this.handleClaimSelection(CARD_TYPES.SCISSORS);
        break;
    }
  }

  /**
   * Handle position hover events
   */
  handlePositionHover(position, isEntering) {
    const positionElement = this.elements.gameGrid?.children[position];
    if (!positionElement) return;

    if (isEntering && this.game?.gridSystem.isPositionAvailable(position)) {
      positionElement.classList.add("hover");
      this.hoveredElements.add(positionElement);
    } else {
      positionElement.classList.remove("hover");
      this.hoveredElements.delete(positionElement);
    }
  }

  /**
   * Handle card hover events
   */
  handleCardHover(card, isEntering) {
    const cardElement = this.findCardElement(card.id);
    if (!cardElement) return;

    if (isEntering) {
      cardElement.classList.add("hover");
      this.hoveredElements.add(cardElement);
    } else {
      cardElement.classList.remove("hover");
      this.hoveredElements.delete(cardElement);
    }
  }

  /**
   * Clear card selection
   */
  clearCardSelection() {
    if (this.selectedCardElement) {
      this.selectedCardElement.classList.remove("selected");
    }

    // Remove selected class from all cards
    const allCards = this.elements.playerHand?.querySelectorAll(".hand-card");
    allCards?.forEach((card) => card.classList.remove("selected"));

    this.selectedCardElement = null;
  }

  /**
   * Clear position selection
   */
  clearPositionSelection() {
    if (this.selectedPositionElement) {
      this.selectedPositionElement.classList.remove("selected");
      this.selectedPositionElement = null;
    }
  }

  /**
   * Clear all selections
   */
  clearSelections() {
    this.clearCardSelection();
    this.clearPositionSelection();
  }

  /**
   * Find card element by ID
   */
  findCardElement(cardId) {
    return this.elements.playerHand?.querySelector(
      `[data-card-id="${cardId}"]`
    );
  }

  /**
   * Show settings modal
   */
  showSettingsModal() {
    const content = `
      <div class="settings-content">
        <h3>Game Settings</h3>
        <div class="setting-group">
          <label>Challenge Time Window</label>
          <select id="challenge-time-setting">
            <option value="3000">3 seconds</option>
            <option value="5000" selected>5 seconds</option>
            <option value="8000">8 seconds</option>
            <option value="10000">10 seconds</option>
          </select>
        </div>
        <div class="setting-group">
          <label>
            <input type="checkbox" id="debug-mode" ${
              DEBUG.ENABLED ? "checked" : ""
            }>
            Debug Mode
          </label>
        </div>
        <div class="setting-group">
          <label>
            <input type="checkbox" id="skip-animations" ${
              DEBUG.SKIP_ANIMATIONS ? "checked" : ""
            }>
            Skip Animations
          </label>
        </div>
        <div class="modal-actions">
          <button class="primary-btn" onclick="inputHandler.saveSettings()">Save Settings</button>
          <button class="secondary-btn" onclick="uiManager.modalManager.hideModal()">Cancel</button>
        </div>
      </div>
    `;

    this.uiManager.modalManager?.showModal("Settings", content);
  }

  /**
   * Show how to play modal
   */
  showHowToPlay() {
    const content = `
      <div class="how-to-play">
        <h3>How to Play Bluff Battle</h3>
        
        <div class="rule-section">
          <h4>🎯 Objective</h4>
          <p>Be the first player to reach <strong>10 points</strong> with at least a <strong>1-point lead</strong>.</p>
        </div>
        
        <div class="rule-section">
          <h4>🃏 Cards</h4>
          <p><strong>🪨 Rock</strong> defeats Scissors</p>
          <p><strong>📄 Paper</strong> defeats Rock</p>
          <p><strong>✂️ Scissors</strong> defeats Paper</p>
        </div>
        
        <div class="rule-section">
          <h4>🎮 Gameplay</h4>
          <ol>
            <li><strong>Placement:</strong> Take turns placing cards on the 5×3 grid</li>
            <li><strong>Claims:</strong> When placing a card, claim what type it is (you can lie!)</li>
            <li><strong>Challenges:</strong> Challenge your opponent's claims if you think they're bluffing</li>
            <li><strong>Battles:</strong> After all cards are placed, adjacent cards battle automatically</li>
            <li><strong>Scoring:</strong> Earn points for winning battles, advancing, and controlling territory</li>
          </ol>
        </div>
        
        <div class="rule-section">
          <h4>⚔️ Battle Resolution</h4>
          <p>Cards battle based on their <em>actual</em> types (not claimed types). Winners advance and earn points.</p>
        </div>
        
        <div class="rule-section">
          <h4>🎭 Bluffing & Challenges</h4>
          <ul>
            <li><strong>Successful Challenge:</strong> Opponent was bluffing - they get caught!</li>
            <li><strong>Failed Challenge:</strong> Opponent was truthful - you lose a point!</li>
            <li><strong>Timing:</strong> You have 5 seconds to challenge after opponent's play</li>
          </ul>
        </div>
        
        <div class="rule-section">
          <h4>⌨️ Keyboard Shortcuts</h4>
          <ul>
            <li><strong>Ctrl+N:</strong> New Game</li>
            <li><strong>Ctrl+H:</strong> How to Play</li>
            <li><strong>P:</strong> Pause/Resume</li>
            <li><strong>1-3:</strong> Select Rock/Paper/Scissors claim</li>
            <li><strong>Space:</strong> Challenge opponent</li>
            <li><strong>Enter:</strong> Confirm play</li>
            <li><strong>Escape:</strong> Cancel/Close</li>
          </ul>
        </div>
      </div>
    `;

    this.uiManager.modalManager?.showModal("How to Play", content);
  }

  /**
   * Save settings from modal
   */
  saveSettings() {
    const challengeTimeSelect = document.getElementById(
      "challenge-time-setting"
    );
    const debugModeCheckbox = document.getElementById("debug-mode");
    const skipAnimationsCheckbox = document.getElementById("skip-animations");

    if (challengeTimeSelect && this.game?.challengeSystem) {
      this.game.challengeSystem.setChallengeTimeWindow(
        parseInt(challengeTimeSelect.value)
      );
    }

    if (debugModeCheckbox) {
      DEBUG.ENABLED = debugModeCheckbox.checked;
    }

    if (skipAnimationsCheckbox) {
      DEBUG.SKIP_ANIMATIONS = skipAnimationsCheckbox.checked;
    }

    this.uiManager.addLogMessage("Settings saved successfully!", "highlight");
    this.uiManager.modalManager?.hideModal();
  }

  /**
   * Clean up input handler
   */
  destroy() {
    // Clear all selections and hover states
    this.clearSelections();

    for (const element of this.hoveredElements) {
      element.classList.remove("hover");
    }
    this.hoveredElements.clear();

    if (DEBUG.ENABLED) {
      console.log("InputHandler destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = InputHandler;
}

/**
 * Bluff Battle - UI State Manager
 * Coordinates UI state across all components and manages animations
 */

class UIStateManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.game = uiManager.game;
    this.currentUIState = UI_STATES.IDLE;
    this.previousUIState = null;
    this.stateData = {};

    // Animation management
    this.animationQueue = [];
    this.isAnimating = false;
    this.activeAnimations = new Set();

    if (DEBUG.ENABLED) {
      console.log("UIStateManager initialized");
    }
  }

  /**
   * Initialize UI state management
   */
  async initialize() {
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  /**
   * Setup event listeners for state changes
   */
  setupEventListeners() {
    // Game state events
    eventBus.on(EVENTS.TURN_START, (data) => {
      this.transitionToState(UI_STATES.IDLE, data);
    });

    eventBus.on(EVENTS.CARD_SELECTED, (data) => {
      if (data.card) {
        this.transitionToState(UI_STATES.CARD_SELECTED, data);
      } else {
        this.transitionToState(UI_STATES.IDLE, data);
      }
    });

    eventBus.on("ui:position_selected", (data) => {
      this.transitionToState(UI_STATES.POSITION_SELECTED, data);
    });

    eventBus.on("ui:claim_selected", (data) => {
      this.transitionToState(UI_STATES.CLAIM_PENDING, data);
    });

    eventBus.on(EVENTS.CHALLENGE_WINDOW_OPEN, (data) => {
      this.transitionToState(UI_STATES.WAITING_OPPONENT, data);
    });

    eventBus.on(EVENTS.BATTLE_START, (data) => {
      this.transitionToState(UI_STATES.BATTLE_ANIMATION, data);
    });

    eventBus.on(EVENTS.BATTLE_END, (data) => {
      this.transitionToState(UI_STATES.IDLE, data);
    });

    eventBus.on(EVENTS.PLAY_CONFIRMED, (data) => {
      this.queueAnimation("cardPlacement", data);
    });

    eventBus.on(EVENTS.BATTLE_RESULT, (data) => {
      this.queueAnimation("battleResult", data);
    });
  }

  /**
   * Transition to a new UI state
   * @param {string} newState - New UI state
   * @param {Object} data - State transition data
   */
  transitionToState(newState, data = {}) {
    if (!Object.values(UI_STATES).includes(newState)) {
      console.warn(`Invalid UI state: ${newState}`);
      return;
    }

    const oldState = this.currentUIState;
    this.previousUIState = oldState;
    this.currentUIState = newState;
    this.stateData[newState] = { ...data, timestamp: Date.now() };

    // Handle state-specific logic
    this.onStateEnter(newState, oldState, data);
    this.onStateExit(oldState, newState, data);

    // Update UI elements based on new state
    this.updateUIForState(newState);

    if (DEBUG.ENABLED) {
      console.log(`UI State: ${oldState} -> ${newState}`, data);
    }

    // Emit state change event
    eventBus.emit("ui_state_changed", {
      oldState,
      newState,
      data,
    });
  }

  /**
   * Handle entering a new state
   * @param {string} state - State being entered
   * @param {string} previousState - Previous state
   * @param {Object} data - State data
   */
  onStateEnter(state, previousState, data) {
    switch (state) {
      case UI_STATES.CARD_SELECTED:
        this.highlightAvailablePositions();
        this.showPositionHints();
        break;

      case UI_STATES.POSITION_SELECTED:
        this.showClaimButtons();
        this.highlightSelectedPosition(data.position);
        break;

      case UI_STATES.CLAIM_PENDING:
        this.showConfirmationButtons();
        this.previewPlay();
        break;

      case UI_STATES.WAITING_OPPONENT:
        this.showChallengeOpportunity();
        this.startChallengeTimer();
        break;

      case UI_STATES.BATTLE_ANIMATION:
        this.prepareBattleAnimations();
        break;
    }
  }

  /**
   * Handle exiting a state
   * @param {string} state - State being exited
   * @param {string} nextState - Next state
   * @param {Object} data - State data
   */
  onStateExit(state, nextState, data) {
    switch (state) {
      case UI_STATES.CARD_SELECTED:
        this.clearPositionHighlights();
        this.hidePositionHints();
        break;

      case UI_STATES.POSITION_SELECTED:
        this.clearPositionSelection();
        break;

      case UI_STATES.CLAIM_PENDING:
        this.hideConfirmationButtons();
        this.clearPlayPreview();
        break;

      case UI_STATES.WAITING_OPPONENT:
        this.hideChallengeOpportunity();
        this.stopChallengeTimer();
        break;

      case UI_STATES.BATTLE_ANIMATION:
        this.cleanupBattleAnimations();
        break;
    }
  }

  /**
   * Update UI elements based on current state
   * @param {string} state - Current UI state
   */
  updateUIForState(state) {
    const gameContainer = this.uiManager.elements.gameContainer;
    if (!gameContainer) return;

    // Remove all state classes
    Object.values(UI_STATES).forEach((uiState) => {
      gameContainer.classList.remove(`ui-state-${uiState.replace("_", "-")}`);
    });

    // Add current state class
    gameContainer.classList.add(`ui-state-${state.replace("_", "-")}`);

    // Update button states
    this.updateButtonStates(state);
  }

  /**
   * Update button states based on UI state
   * @param {string} state - Current UI state
   */
  updateButtonStates(state) {
    const elements = this.uiManager.elements;

    // Disable all interactive elements by default
    const interactiveElements = [
      elements.confirmPlay,
      elements.cancelPlay,
      elements.challengeBtn,
      elements.claimRock,
      elements.claimPaper,
      elements.claimScissors,
    ];

    interactiveElements.forEach((element) => {
      if (element) element.disabled = true;
    });

    // Enable based on state
    switch (state) {
      case UI_STATES.CARD_SELECTED:
        if (elements.cancelPlay) elements.cancelPlay.disabled = false;
        break;

      case UI_STATES.POSITION_SELECTED:
        [
          elements.claimRock,
          elements.claimPaper,
          elements.claimScissors,
        ].forEach((btn) => {
          if (btn) btn.disabled = false;
        });
        if (elements.cancelPlay) elements.cancelPlay.disabled = false;
        break;

      case UI_STATES.CLAIM_PENDING:
        if (elements.confirmPlay) elements.confirmPlay.disabled = false;
        if (elements.cancelPlay) elements.cancelPlay.disabled = false;
        break;

      case UI_STATES.WAITING_OPPONENT:
        if (elements.challengeBtn) {
          elements.challengeBtn.disabled = false;
          elements.challengeBtn.style.display = "block";
        }
        break;
    }
  }

  // State-specific UI methods

  /**
   * Highlight available positions for card placement
   */
  highlightAvailablePositions() {
    if (!this.game?.gridSystem) return;

    const emptyPositions = this.game.gridSystem.getEmptyPositions();
    this.uiManager.gridRenderer?.highlightPositions(
      emptyPositions,
      "available"
    );
  }

  /**
   * Clear position highlights
   */
  clearPositionHighlights() {
    this.uiManager.gridRenderer?.clearHighlights();
  }

  /**
   * Show position hints for strategic placement
   */
  showPositionHints() {
    if (!this.game?.selectedCard || !this.game?.gridSystem) return;

    const recommendations = this.game.gridSystem.getRecommendedPositions(
      this.game.humanPlayer,
      this.game.selectedCard
    );

    this.uiManager.gridRenderer?.showRecommendations(
      recommendations.slice(0, 3)
    );
  }

  /**
   * Hide position hints
   */
  hidePositionHints() {
    this.uiManager.gridRenderer?.clearRecommendations();
  }

  /**
   * Highlight selected position
   * @param {number} position - Position to highlight
   */
  highlightSelectedPosition(position) {
    this.uiManager.gridRenderer?.highlightPositions([position], "selected");
  }

  /**
   * Clear position selection
   */
  clearPositionSelection() {
    this.uiManager.gridRenderer?.clearHighlights();
  }

  /**
   * Show claim buttons
   */
  showClaimButtons() {
    const claimSection = document.querySelector(".claim-section");
    if (claimSection) {
      claimSection.classList.add("active");
    }
  }

  /**
   * Show confirmation buttons
   */
  showConfirmationButtons() {
    const actionButtons = document.querySelector(".action-buttons");
    if (actionButtons) {
      actionButtons.classList.add("active");
    }
  }

  /**
   * Hide confirmation buttons
   */
  hideConfirmationButtons() {
    const actionButtons = document.querySelector(".action-buttons");
    if (actionButtons) {
      actionButtons.classList.remove("active");
    }
  }

  /**
   * Preview the current play
   */
  previewPlay() {
    if (!this.game?.selectedCard || this.game?.selectedPosition === null)
      return;

    this.uiManager.gridRenderer?.showBattlePreview(
      this.game.selectedPosition,
      this.game.selectedCard
    );
  }

  /**
   * Clear play preview
   */
  clearPlayPreview() {
    this.uiManager.gridRenderer?.clearBattlePreview();
  }

  /**
   * Show challenge opportunity indicator
   */
  showChallengeOpportunity() {
    const challengeSection = document.querySelector(".challenge-section");
    if (challengeSection) {
      challengeSection.classList.add("opportunity");
    }

    // Add pulsing effect to challenge button
    const challengeBtn = this.uiManager.elements.challengeBtn;
    if (challengeBtn) {
      challengeBtn.classList.add("pulse", "opportunity");
    }
  }

  /**
   * Hide challenge opportunity indicator
   */
  hideChallengeOpportunity() {
    const challengeSection = document.querySelector(".challenge-section");
    if (challengeSection) {
      challengeSection.classList.remove("opportunity");
    }

    const challengeBtn = this.uiManager.elements.challengeBtn;
    if (challengeBtn) {
      challengeBtn.classList.remove("pulse", "opportunity");
    }
  }

  /**
   * Start challenge timer visualization
   */
  startChallengeTimer() {
    const challengeBtn = this.uiManager.elements.challengeBtn;
    if (!challengeBtn) return;

    const timeWindow = this.game?.challengeSystem?.challengeTimeWindow || 5000;

    // Add countdown visual
    challengeBtn.style.setProperty("--countdown-duration", `${timeWindow}ms`);
    challengeBtn.classList.add("countdown");

    this.challengeTimerTimeout = setTimeout(() => {
      this.stopChallengeTimer();
    }, timeWindow);
  }

  /**
   * Stop challenge timer visualization
   */
  stopChallengeTimer() {
    const challengeBtn = this.uiManager.elements.challengeBtn;
    if (challengeBtn) {
      challengeBtn.classList.remove("countdown");
      challengeBtn.style.removeProperty("--countdown-duration");
    }

    if (this.challengeTimerTimeout) {
      clearTimeout(this.challengeTimerTimeout);
      this.challengeTimerTimeout = null;
    }
  }

  /**
   * Prepare battle animations
   */
  prepareBattleAnimations() {
    const gameGrid = this.uiManager.elements.gameGrid;
    if (gameGrid) {
      gameGrid.classList.add("battle-mode");
    }
  }

  /**
   * Clean up battle animations
   */
  cleanupBattleAnimations() {
    const gameGrid = this.uiManager.elements.gameGrid;
    if (gameGrid) {
      gameGrid.classList.remove("battle-mode");
    }
  }

  // Animation Management

  /**
   * Queue an animation for execution
   * @param {string} type - Animation type
   * @param {Object} data - Animation data
   * @param {number} priority - Animation priority (higher = sooner)
   */
  queueAnimation(type, data, priority = 0) {
    const animation = {
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority,
      timestamp: Date.now(),
    };

    this.animationQueue.push(animation);
    this.animationQueue.sort((a, b) => b.priority - a.priority);

    if (DEBUG.ENABLED) {
      console.log(`Animation queued: ${type}`, data);
    }

    // Start processing if not already running
    if (!this.isAnimating) {
      this.processAnimationQueue();
    }
  }

  /**
   * Process the animation queue
   */
  async processAnimationQueue() {
    if (this.isAnimating || this.animationQueue.length === 0) return;

    this.isAnimating = true;

    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift();

      try {
        await this.executeAnimation(animation);
      } catch (error) {
        console.error(`Animation failed: ${animation.type}`, error);
      }

      // Small delay between animations
      if (this.animationQueue.length > 0 && !DEBUG.SKIP_ANIMATIONS) {
        await this.delay(100);
      }
    }

    this.isAnimating = false;
  }

  /**
   * Execute a specific animation
   * @param {Object} animation - Animation to execute
   */
  async executeAnimation(animation) {
    if (DEBUG.SKIP_ANIMATIONS) {
      return Promise.resolve();
    }

    this.activeAnimations.add(animation.id);

    switch (animation.type) {
      case "cardPlacement":
        await this.animateCardPlacement(animation.data);
        break;

      case "battleResult":
        await this.animateBattleResult(animation.data);
        break;

      case "scoreUpdate":
        await this.animateScoreUpdate(animation.data);
        break;

      case "cardReveal":
        await this.animateCardReveal(animation.data);
        break;

      case "roundTransition":
        await this.animateRoundTransition(animation.data);
        break;

      default:
        console.warn(`Unknown animation type: ${animation.type}`);
    }

    this.activeAnimations.delete(animation.id);
  }

  /**
   * Animate card placement
   * @param {Object} data - Animation data
   */
  async animateCardPlacement(data) {
    const { position, card } = data;

    if (this.uiManager.gridRenderer) {
      this.uiManager.gridRenderer.animateCardPlacement(position);
    }

    return this.delay(ANIMATIONS.CARD_MOVE);
  }

  /**
   * Animate battle result
   * @param {Object} data - Battle result data
   */
  async animateBattleResult(data) {
    const { battle, outcome } = data;

    if (this.uiManager.gridRenderer) {
      this.uiManager.gridRenderer.animateBattleResult(battle, outcome);
    }

    return this.delay(ANIMATIONS.BATTLE_RESOLVE);
  }

  /**
   * Animate score update
   * @param {Object} data - Score data
   */
  async animateScoreUpdate(data) {
    const { player, pointsAdded } = data;

    // Find score element
    const scoreElement =
      player.type === PLAYER_TYPES.HUMAN
        ? this.uiManager.elements.playerScore
        : this.uiManager.elements.aiScore;

    if (!scoreElement) return;

    // Add animation class
    scoreElement.classList.add("score-update");

    // Show points change
    if (pointsAdded !== 0) {
      const changeIndicator = document.createElement("span");
      changeIndicator.className = `score-change ${
        pointsAdded > 0 ? "positive" : "negative"
      }`;
      changeIndicator.textContent = `${
        pointsAdded > 0 ? "+" : ""
      }${pointsAdded}`;

      scoreElement.parentElement.appendChild(changeIndicator);

      // Animate and remove
      setTimeout(() => {
        changeIndicator.classList.add("animate");
      }, 10);

      setTimeout(() => {
        if (changeIndicator.parentElement) {
          changeIndicator.parentElement.removeChild(changeIndicator);
        }
      }, ANIMATIONS.SCORE_UPDATE);
    }

    // Remove animation class
    setTimeout(() => {
      scoreElement.classList.remove("score-update");
    }, ANIMATIONS.SCORE_UPDATE);

    return this.delay(ANIMATIONS.SCORE_UPDATE);
  }

  /**
   * Animate card reveal
   * @param {Object} data - Card reveal data
   */
  async animateCardReveal(data) {
    const { card, position } = data;

    if (this.uiManager.gridRenderer) {
      const positionElements = this.uiManager.elements.gameGrid?.children;
      const positionElement = positionElements?.[position];

      if (positionElement) {
        positionElement.classList.add("card-reveal");

        setTimeout(() => {
          positionElement.classList.remove("card-reveal");
        }, ANIMATIONS.CARD_FLIP);
      }
    }

    return this.delay(ANIMATIONS.CARD_FLIP);
  }

  /**
   * Animate round transition
   * @param {Object} data - Round transition data
   */
  async animateRoundTransition(data) {
    const gameContainer = this.uiManager.elements.gameContainer;
    if (!gameContainer) return;

    // Fade out
    gameContainer.classList.add("round-transition-out");
    await this.delay(500);

    // Update content happens here (externally)

    // Fade in
    gameContainer.classList.remove("round-transition-out");
    gameContainer.classList.add("round-transition-in");

    await this.delay(500);
    gameContainer.classList.remove("round-transition-in");
  }

  /**
   * Start animation processing loop
   */
  startAnimationLoop() {
    const processLoop = () => {
      if (this.animationQueue.length > 0 && !this.isAnimating) {
        this.processAnimationQueue();
      }

      // Continue loop
      requestAnimationFrame(processLoop);
    };

    requestAnimationFrame(processLoop);
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animationQueue = [];
    this.activeAnimations.clear();
    this.isAnimating = false;

    // Clear any running timers
    if (this.challengeTimerTimeout) {
      clearTimeout(this.challengeTimerTimeout);
      this.challengeTimerTimeout = null;
    }
  }

  /**
   * Get current UI state
   * @returns {string} Current UI state
   */
  getCurrentState() {
    return this.currentUIState;
  }

  /**
   * Get previous UI state
   * @returns {string|null} Previous UI state
   */
  getPreviousState() {
    return this.previousUIState;
  }

  /**
   * Get state data
   * @param {string} state - State to get data for (default: current)
   * @returns {Object} State data
   */
  getStateData(state = null) {
    const targetState = state || this.currentUIState;
    return this.stateData[targetState] || {};
  }

  /**
   * Check if currently in a specific state
   * @param {string} state - State to check
   * @returns {boolean} True if in specified state
   */
  isInState(state) {
    return this.currentUIState === state;
  }

  /**
   * Check if any animations are currently running
   * @returns {boolean} True if animations are running
   */
  isAnimationActive() {
    return this.isAnimating || this.activeAnimations.size > 0;
  }

  /**
   * Get animation queue status
   * @returns {Object} Animation status
   */
  getAnimationStatus() {
    return {
      isAnimating: this.isAnimating,
      queueLength: this.animationQueue.length,
      activeAnimations: this.activeAnimations.size,
      nextAnimation: this.animationQueue[0]?.type || null,
    };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset UI state to initial state
   */
  reset() {
    this.transitionToState(UI_STATES.IDLE);
    this.clearAnimations();
    this.stateData = {};

    if (DEBUG.ENABLED) {
      console.log("UIStateManager reset");
    }
  }

  /**
   * Validate UI state manager
   * @returns {boolean} True if valid
   */
  validate() {
    if (!Object.values(UI_STATES).includes(this.currentUIState)) {
      console.error("Invalid current UI state:", this.currentUIState);
      return false;
    }

    return true;
  }

  /**
   * Clean up UI state manager
   */
  destroy() {
    this.clearAnimations();
    this.stateData = {};

    if (DEBUG.ENABLED) {
      console.log("UIStateManager destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = UIStateManager;
}

/**
 * Bluff Battle - Core UI Manager (FIXED)
 * Main UI orchestrator - delegates to specialized renderers
 */

class UIManager {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.isInitialized = false;

    // Specialized renderers - will be created after DOM elements are cached
    this.gridRenderer = null;
    this.handRenderer = null;
    this.logRenderer = null;
    this.modalManager = null;
    this.inputHandler = null;
    this.stateManager = null;

    if (DEBUG.ENABLED) {
      console.log("UIManager initialized");
    }
  }

  /**
   * Initialize the UI Manager and all sub-systems
   */
  async initialize() {
    try {
      // Cache DOM elements FIRST
      this.cacheElements();

      // Initialize specialized renderers AFTER elements are cached
      await this.initializeRenderers();

      // Setup core event listeners
      this.setupCoreEventListeners();

      // Initialize UI state
      await this.initializeUI();

      this.isInitialized = true;

      if (DEBUG.ENABLED) {
        console.log("UIManager initialization complete");
      }
    } catch (error) {
      console.error("Failed to initialize UIManager:", error);
      throw error;
    }
  }

  /**
   * Cache frequently accessed DOM elements
   */
  cacheElements() {
    // Main containers
    this.elements.gameContainer = document.getElementById("game-container");
    this.elements.loadingScreen = document.getElementById("loading-screen");
    this.elements.modalOverlay = document.getElementById("modal-overlay");
    this.elements.modalContent = document.getElementById("modal-content");

    // Header elements
    this.elements.playerScore = document.getElementById("player-score");
    this.elements.aiScore = document.getElementById("ai-score");
    this.elements.settingsBtn = document.getElementById("settings-btn");
    this.elements.pauseBtn = document.getElementById("pause-btn");

    // Game area
    this.elements.gameGrid = document.getElementById("game-grid");
    this.elements.gameStatus = document.getElementById("game-status");
    this.elements.turnIndicator = document.getElementById("turn-indicator");
    this.elements.roundCounter = document.getElementById("round-counter");
    this.elements.playerHand = document.getElementById("player-hand");

    // Action panel
    this.elements.claimRock = document.getElementById("claim-rock");
    this.elements.claimPaper = document.getElementById("claim-paper");
    this.elements.claimScissors = document.getElementById("claim-scissors");
    this.elements.challengeBtn = document.getElementById("challenge-btn");
    this.elements.confirmPlay = document.getElementById("confirm-play");
    this.elements.cancelPlay = document.getElementById("cancel-play");

    // Game log
    this.elements.gameLog = document.getElementById("game-log");

    this.validateEssentialElements();
  }

  /**
   * Validate that essential DOM elements exist
   */
  validateEssentialElements() {
    const requiredElements = [
      "gameContainer",
      "gameGrid",
      "playerHand",
      "gameStatus",
      "playerScore",
      "aiScore",
      "confirmPlay",
      "cancelPlay",
    ];

    for (const elementName of requiredElements) {
      if (!this.elements[elementName]) {
        throw new Error(`Required UI element not found: ${elementName}`);
      }
    }
  }

  /**
   * Initialize all specialized renderers
   */
  async initializeRenderers() {
    // Grid renderer
    if (this.game?.gridSystem && this.elements.gameGrid) {
      this.gridRenderer = new GridRenderer(
        this.elements.gameGrid,
        this.game.gridSystem
      );
      await this.gridRenderer.initialize();
    }

    // Hand renderer - FIXED: Only create if we have a human player
    if (this.game?.humanPlayer && this.elements.playerHand) {
      this.handRenderer = new HandRenderer(
        this.elements.playerHand,
        this.game.humanPlayer
      );
      await this.handRenderer.initialize();
    }

    // Log renderer
    if (this.elements.gameLog) {
      this.logRenderer = new LogRenderer(this.elements.gameLog);
      await this.logRenderer.initialize();
    }

    // Modal manager
    if (this.elements.modalOverlay && this.elements.modalContent) {
      this.modalManager = new ModalManager(
        this.elements.modalOverlay,
        this.elements.modalContent
      );
      await this.modalManager.initialize();
    }

    // Input handler
    this.inputHandler = new InputHandler(this);
    await this.inputHandler.initialize();

    // UI state manager
    this.stateManager = new UIStateManager(this);
    await this.stateManager.initialize();

    if (DEBUG.ENABLED) {
      console.log("All renderers initialized successfully");
    }
  }

  /**
   * Setup core UI event listeners
   */
  setupCoreEventListeners() {
    // Game state events
    eventBus.on(EVENTS.GAME_START, (data) => this.onGameStart(data));
    eventBus.on(EVENTS.GAME_END, (data) => this.onGameEnd(data));
    eventBus.on(EVENTS.ROUND_START, (data) => this.onRoundStart(data));
    eventBus.on(EVENTS.ROUND_END, (data) => this.onRoundEnd(data));
    eventBus.on(EVENTS.TURN_START, (data) => this.onTurnStart(data));
    eventBus.on(EVENTS.TURN_END, (data) => this.onTurnEnd(data));

    // Score events
    eventBus.on(EVENTS.SCORE_UPDATE, (data) => this.updateScores());

    // Challenge events
    eventBus.on(EVENTS.CHALLENGE_WINDOW_OPEN, (data) =>
      this.onChallengeWindowOpen(data)
    );
    eventBus.on(EVENTS.CHALLENGE_WINDOW_CLOSED, (data) =>
      this.onChallengeWindowClosed(data)
    );
    eventBus.on(EVENTS.CHALLENGE_MADE, (data) => this.onChallengeMade(data));

    // Error events
    eventBus.on(EVENTS.ERROR, (data) => this.onError(data));

    // Card and play events - FIXED: Handle these properly
    eventBus.on(EVENTS.CARD_SELECTED, (data) => this.onCardSelected(data));
    eventBus.on(EVENTS.PLAY_CONFIRMED, (data) => this.onPlayConfirmed(data));
  }

  /**
   * Update the entire UI based on current game state
   */
  updateUI() {
    if (!this.game || !this.isInitialized) return;

    try {
      const gameState = this.game.getGameState();

      // Update scores
      this.updateScores();

      // Update turn and round info
      this.updateTurnIndicator(gameState);
      this.updateRoundCounter(gameState.roundNumber || 1);

      // Update action buttons
      this.updateActionButtons(gameState);
      this.updateChallengeButton(gameState);

      // Update player hand - FIXED: Always update hand display
      this.updatePlayerHand();

      // Let specialized renderers update themselves
      this.gridRenderer?.render();
    } catch (error) {
      console.error("Error updating UI:", error);
    }
  }

  /**
   * Update player hand display - FIXED: Direct DOM manipulation if renderer not available
   */
  updatePlayerHand() {
    if (!this.elements.playerHand || !this.game?.humanPlayer) return;

    // If we have a hand renderer, use it
    if (this.handRenderer) {
      this.handRenderer.render();
      return;
    }

    // Fallback: Direct DOM manipulation for card display
    this.elements.playerHand.innerHTML = "";
    const hand = this.game.humanPlayer.hand;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const cardElement = this.createCardElement(card, i);
      this.elements.playerHand.appendChild(cardElement);

      // Restore selection state if this card is selected
      if (this.game.selectedCard && this.game.selectedCard.id === card.id) {
        cardElement.classList.add("selected");
      }
    }
  }

  /**
   * Create a card element - FIXED: Ensure this works without HandRenderer
   */
  createCardElement(card, index) {
    const cardElement = document.createElement("div");
    cardElement.className = "hand-card";
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.cardIndex = index;

    const cardIcon = document.createElement("div");
    cardIcon.className = "card-icon";
    cardIcon.textContent = card.getIcon();

    const cardName = document.createElement("div");
    cardName.className = "card-name";
    cardName.textContent = card.getName();

    cardElement.appendChild(cardIcon);
    cardElement.appendChild(cardName);

    // Add click listener - FIXED: Make sure this works
    cardElement.addEventListener("click", () => {
      this.handleCardSelection(card);
    });

    // Add hover effects
    cardElement.addEventListener("mouseenter", () => {
      cardElement.classList.add("hover");
    });

    cardElement.addEventListener("mouseleave", () => {
      cardElement.classList.remove("hover");
    });

    return cardElement;
  }

  /**
   * Handle card selection - FIXED: Direct handling
   */
  handleCardSelection(card) {
    if (this.inputHandler) {
      this.inputHandler.handleCardSelection(card);
    } else {
      // Fallback: Direct game interaction
      if (this.game.currentPlayer?.type === PLAYER_TYPES.HUMAN) {
        this.game.handlePlayerAction(PLAYER_ACTIONS.SELECT_CARD, { card });
        this.updateUI();
      }
    }
  }

  /**
   * Update score display
   */
  updateScores() {
    if (this.game?.humanPlayer && this.elements.playerScore) {
      this.elements.playerScore.textContent = this.game.humanPlayer.score;
    }
    if (this.game?.aiPlayer && this.elements.aiScore) {
      this.elements.aiScore.textContent = this.game.aiPlayer.score;
    }
  }

  /**
   * Update turn indicator
   */
  updateTurnIndicator(gameState) {
    if (!this.elements.turnIndicator) return;

    let text = "Game Setup";

    if (gameState.currentPlayer) {
      text =
        gameState.currentPlayer.type === PLAYER_TYPES.HUMAN
          ? "Your Turn"
          : "AI Turn";

      if (
        gameState.waitingForChallenge ||
        (this.game.challengeSystem && this.game.challengeSystem.canChallenge())
      ) {
        text = "⚡ Challenge Opportunity!";
      }
    }

    switch (gameState.turnPhase) {
      case TURN_PHASES.BATTLE:
        text = "Battle Phase";
        break;
      case TURN_PHASES.SCORING:
        text = "Scoring";
        break;
    }

    this.elements.turnIndicator.textContent = text;
  }

  /**
   * Update round counter
   */
  updateRoundCounter(roundNumber) {
    if (this.elements.roundCounter) {
      this.elements.roundCounter.textContent = `Round ${roundNumber}`;
    }
  }

  /**
   * Update action buttons state
   */
  updateActionButtons(gameState) {
    const canPlay =
      gameState.currentPlayer?.type === PLAYER_TYPES.HUMAN &&
      gameState.turnPhase === TURN_PHASES.PLACEMENT &&
      gameState.selectedCard &&
      gameState.selectedPosition !== null &&
      gameState.pendingClaim;

    const hasSelection =
      gameState.selectedCard || gameState.selectedPosition !== null;

    // Update confirm button
    if (this.elements.confirmPlay) {
      this.elements.confirmPlay.disabled = !canPlay;
    }

    // Update cancel button
    if (this.elements.cancelPlay) {
      this.elements.cancelPlay.disabled = !hasSelection;
    }

    // Update claim buttons
    const claimButtons = [
      this.elements.claimRock,
      this.elements.claimPaper,
      this.elements.claimScissors,
    ];
    const canClaim =
      gameState.currentPlayer?.type === PLAYER_TYPES.HUMAN &&
      gameState.selectedCard;

    claimButtons.forEach((button) => {
      if (button) {
        button.disabled = !canClaim;
        button.classList.toggle(
          "selected",
          button.dataset.type === gameState.pendingClaim
        );
      }
    });
  }

  /**
   * Update challenge button state
   */
  updateChallengeButton(gameState) {
    if (!this.elements.challengeBtn) return;

    const canChallenge =
      this.game.challengeSystem?.canChallenge() &&
      (!gameState.currentPlayer ||
        gameState.currentPlayer.type === PLAYER_TYPES.HUMAN);

    if (canChallenge) {
      this.elements.challengeBtn.style.display = "block";
      this.elements.challengeBtn.disabled = false;
      this.elements.challengeBtn.classList.add("pulse");

      const challengeablePlay =
        this.game.challengeSystem.getChallengeablePlay();
      if (challengeablePlay) {
        this.elements.challengeBtn.title = `Challenge ${challengeablePlay.player}'s ${challengeablePlay.claimedType} claim`;
      }
    } else {
      this.elements.challengeBtn.style.display = "none";
      this.elements.challengeBtn.disabled = true;
      this.elements.challengeBtn.classList.remove("pulse");
      this.elements.challengeBtn.title = "";
    }
  }

  /**
   * Initialize UI state
   */
  async initializeUI() {
    this.hideLoadingScreen();
    this.updateUI();
    this.addLogMessage("Welcome to Bluff Battle! Start a new game to begin.");
  }

  // Event Handlers
  onGameStart(data) {
    this.addLogMessage("Game started! Place your cards strategically.");

    // FIXED: Reinitialize renderers after game starts (when players exist)
    if (!this.handRenderer && this.game?.humanPlayer) {
      this.handRenderer = new HandRenderer(
        this.elements.playerHand,
        this.game.humanPlayer
      );
      this.handRenderer.initialize();
    }

    this.updateUI();
  }

  onGameEnd(data) {
    const winnerName = data.winner.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
    this.addLogMessage(
      `Game over! ${winnerName} won with ${
        data.finalScores[
          data.winner.type === PLAYER_TYPES.HUMAN ? "human" : "ai"
        ]
      } points.`
    );
    this.modalManager?.showGameEndModal(data);
  }

  onRoundStart(data) {
    this.addLogMessage(`Round ${data.roundNumber} started.`);
    this.updateUI();
  }

  onRoundEnd(data) {
    const message = data.winner
      ? `Round ${data.roundNumber} ended. ${data.winner.name} leads!`
      : `Round ${data.roundNumber} ended in a tie.`;
    this.addLogMessage(message);
  }

  onTurnStart(data) {
    if (data.player.type === PLAYER_TYPES.HUMAN) {
      this.addLogMessage("Your turn! Select a card and position.");
    } else {
      this.addLogMessage("AI is thinking...");
    }
    this.updateUI();
  }

  onTurnEnd(data) {
    this.updateUI();
  }

  onCardSelected(data) {
    this.updateUI();
  }

  onPlayConfirmed(data) {
    if (!data || !data.player) {
      console.warn("Invalid play confirmed data:", data);
      return;
    }

    const playerName = data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
    const claimName = data.claimedType
      ? CARD_INFO[data.claimedType].name
      : "Unknown";
    const position = data.position !== undefined ? data.position : "?";

    this.addLogMessage(
      `${playerName} played ${claimName} at position ${position}.`
    );
    this.updateUI();
  }

  onChallengeWindowOpen(data) {
    this.addLogMessage(
      "💭 Challenge opportunity! Click the Challenge button if you think the AI is bluffing!",
      "highlight"
    );
    this.updateUI();
  }

  onChallengeWindowClosed(data) {
    this.addLogMessage("Challenge window closed.", "normal");
    this.updateUI();
  }

  onChallengeMade(data) {
    const challengerName =
      data.challenger.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
    if (data.challengeResult) {
      const wasBluff = data.challengeResult.wasBluff;
      const resultText = wasBluff
        ? "Challenge successful! They were bluffing!"
        : "Challenge failed. They were telling the truth.";
      this.addLogMessage(
        `⚡ ${challengerName} challenged: ${resultText}`,
        "challenge"
      );
    } else {
      this.addLogMessage(`⚡ ${challengerName} made a challenge`, "challenge");
    }
    this.updateUI();
  }

  onError(data) {
    console.error("Game error:", data.error);
    this.addLogMessage("An error occurred. Please try again.", "error");
  }

  // Utility Methods
  addLogMessage(message, type = "normal") {
    if (this.logRenderer) {
      this.logRenderer.addMessage(message, "general", type);
    } else {
      // Fallback: Direct DOM manipulation
      if (this.elements.gameLog) {
        const logEntry = document.createElement("div");
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = message;
        this.elements.gameLog.appendChild(logEntry);

        // Keep log manageable
        while (this.elements.gameLog.children.length > 50) {
          this.elements.gameLog.removeChild(this.elements.gameLog.firstChild);
        }

        // Scroll to bottom
        this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
      }
    }
  }

  showLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.remove("hidden");
    }
  }

  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.add("hidden");
    }
  }

  /**
   * Start new game with UI initialization
   */
  async startNewGame() {
    try {
      this.showLoadingScreen();

      if (this.game) {
        await this.game.initializeGame({ playerName: "Player" });
      }

      this.hideLoadingScreen();
      this.addLogMessage("New game started! Good luck!", "highlight");
    } catch (error) {
      console.error("Failed to start new game:", error);
      this.hideLoadingScreen();
      this.addLogMessage(
        "Failed to start new game. Please try again.",
        "error"
      );
    }
  }

  /**
   * Validate UI state
   */
  validate() {
    const requiredElements = [
      "gameContainer",
      "gameGrid",
      "playerHand",
      "gameStatus",
    ];

    for (const elementName of requiredElements) {
      if (!this.elements[elementName]) {
        console.error(`UIManager: Missing required element: ${elementName}`);
        return false;
      }
    }

    if (
      this.elements.gameGrid &&
      this.elements.gameGrid.children.length !== GAME_CONFIG.TOTAL_POSITIONS
    ) {
      console.error("UIManager: Grid has incorrect number of positions");
      return false;
    }

    return true;
  }

  /**
   * Clean up UI Manager
   */
  destroy() {
    // Destroy specialized renderers
    this.gridRenderer?.destroy();
    this.handRenderer?.destroy();
    this.logRenderer?.destroy();
    this.modalManager?.destroy();
    this.inputHandler?.destroy();
    this.stateManager?.destroy();

    // Clear references
    this.elements = {};
    this.isInitialized = false;

    if (DEBUG.ENABLED) {
      console.log("UIManager destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = UIManager;
}

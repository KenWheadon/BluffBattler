/**
 * Bluff Battle - UI Manager (FIXED)
 * Key fixes: Challenge button visibility, card selection highlighting
 */

class UIManager {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.isInitialized = false;
    this.animationQueue = [];
    this.isAnimating = false;

    // UI state
    this.selectedCardElement = null;
    this.selectedPositionElement = null;
    this.hoveredElements = new Set();

    if (DEBUG.ENABLED) {
      console.log("UIManager initialized");
    }
  }

  /**
   * Initialize the UI Manager and cache DOM elements
   */
  async initialize() {
    try {
      // Cache frequently used DOM elements
      this.cacheElements();

      // Setup event listeners
      this.setupEventListeners();

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
   * Cache DOM elements for quick access
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

    // Validate essential elements exist
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
   * Setup event listeners for UI interactions
   */
  setupEventListeners() {
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

    // Control button listeners
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

    // Game event listeners
    this.setupGameEventListeners();

    // Global key listeners
    document.addEventListener("keydown", (e) => {
      this.handleKeyPress(e);
    });

    // Modal click-outside-to-close
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.addEventListener("click", (e) => {
        if (e.target === this.elements.modalOverlay) {
          this.hideModal();
        }
      });
    }
  }

  /**
   * Setup game event listeners
   */
  setupGameEventListeners() {
    // Game state events
    eventBus.on(EVENTS.GAME_START, (data) => {
      this.onGameStart(data);
    });

    eventBus.on(EVENTS.GAME_END, (data) => {
      this.onGameEnd(data);
    });

    eventBus.on(EVENTS.ROUND_START, (data) => {
      this.onRoundStart(data);
    });

    eventBus.on(EVENTS.ROUND_END, (data) => {
      this.onRoundEnd(data);
    });

    eventBus.on(EVENTS.TURN_START, (data) => {
      this.onTurnStart(data);
    });

    eventBus.on(EVENTS.TURN_END, (data) => {
      this.onTurnEnd(data);
    });

    // Play events
    eventBus.on(EVENTS.CARD_SELECTED, (data) => {
      this.onCardSelected(data);
    });

    eventBus.on(EVENTS.PLAY_CONFIRMED, (data) => {
      this.onPlayConfirmed(data);
    });

    // Battle events
    eventBus.on(EVENTS.BATTLE_START, (data) => {
      this.onBattleStart(data);
    });

    eventBus.on(EVENTS.BATTLE_RESULT, (data) => {
      this.onBattleResult(data);
    });

    eventBus.on(EVENTS.BATTLE_END, (data) => {
      this.onBattleEnd(data);
    });

    // Challenge events - FIXED
    eventBus.on(EVENTS.CHALLENGE_MADE, (data) => {
      this.onChallengeMade(data);
    });

    eventBus.on(EVENTS.CHALLENGE_WINDOW_OPEN, (data) => {
      this.onChallengeWindowOpen(data);
    });

    eventBus.on(EVENTS.CHALLENGE_WINDOW_CLOSED, (data) => {
      this.onChallengeWindowClosed(data);
    });

    // Score events
    eventBus.on(EVENTS.SCORE_UPDATE, (data) => {
      this.onScoreUpdate(data);
    });

    // Error events
    eventBus.on(EVENTS.ERROR, (data) => {
      this.onError(data);
    });

    if (DEBUG.ENABLED) {
      console.log("Game event listeners setup complete");
    }
  }

  /**
   * Initialize UI state
   */
  async initializeUI() {
    // Hide loading screen
    this.hideLoadingScreen();

    // Create initial grid
    this.createGrid();

    // Update initial UI state
    this.updateUI();

    // Add initial log message
    this.addLogMessage("Welcome to Bluff Battle! Start a new game to begin.");
  }

  /**
   * Create the game grid
   */
  createGrid() {
    if (!this.elements.gameGrid) return;

    this.elements.gameGrid.innerHTML = "";

    for (let i = 0; i < GAME_CONFIG.TOTAL_POSITIONS; i++) {
      const gridPosition = document.createElement("div");
      gridPosition.className = "grid-position";
      gridPosition.dataset.position = i;

      // Add click listener for position selection
      gridPosition.addEventListener("click", () => {
        this.handlePositionSelection(i);
      });

      // Add hover effects
      gridPosition.addEventListener("mouseenter", () => {
        this.handlePositionHover(i, true);
      });

      gridPosition.addEventListener("mouseleave", () => {
        this.handlePositionHover(i, false);
      });

      this.elements.gameGrid.appendChild(gridPosition);
    }

    if (DEBUG.ENABLED) {
      console.log(`Created grid with ${GAME_CONFIG.TOTAL_POSITIONS} positions`);
    }
  }

  /**
   * Update the entire UI based on current game state
   */
  updateUI() {
    if (!this.game || !this.isInitialized) {
      return;
    }

    try {
      const gameState = this.game.getGameState();

      // Update scores
      this.updateScores();

      // Update turn indicator
      this.updateTurnIndicator(gameState);

      // Update round counter
      this.updateRoundCounter(gameState.roundNumber || 1);

      // Update player hand
      this.updatePlayerHand();

      // Update grid
      this.updateGrid();

      // Update action buttons
      this.updateActionButtons(gameState);

      // Update challenge button - FIXED
      this.updateChallengeButton(gameState);
    } catch (error) {
      console.error("Error updating UI:", error);
    }
  }

  /**
   * Update challenge button state - FIXED
   * @param {Object} gameState - Current game state
   */
  updateChallengeButton(gameState) {
    if (!this.elements.challengeBtn) return;

    // FIXED: Check if challenge system exists and can challenge
    const canChallenge =
      this.game.challengeSystem &&
      this.game.challengeSystem.canChallenge() &&
      (!gameState.currentPlayer ||
        gameState.currentPlayer.type === PLAYER_TYPES.HUMAN);

    // FIXED: Show/hide button based on challenge availability
    if (canChallenge) {
      this.elements.challengeBtn.style.display = "block";
      this.elements.challengeBtn.disabled = false;
      this.elements.challengeBtn.classList.add("pulse");

      // Show challenge info
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

    if (DEBUG.ENABLED) {
      console.log("Challenge button updated:", {
        canChallenge,
        gameState: gameState.waitingForChallenge,
      });
    }
  }

  /**
   * Handle card selection - FIXED
   * @param {Card} card - Selected card
   */
  handleCardSelection(card) {
    // FIXED: Clear previous selection first
    this.clearCardSelection();

    eventBus.emit("ui:card_selected", { card });

    // FIXED: Update visual selection immediately
    const cardElement = this.findCardElement(card.id);
    if (cardElement) {
      cardElement.classList.add("selected");
      this.selectedCardElement = cardElement;

      if (DEBUG.ENABLED) {
        console.log("Card selected and highlighted:", card.id);
      }
    }

    this.updateUI();
  }

  /**
   * Update player hand display - FIXED
   */
  updatePlayerHand() {
    if (!this.elements.playerHand || !this.game || !this.game.humanPlayer)
      return;

    this.elements.playerHand.innerHTML = "";
    const hand = this.game.humanPlayer.hand;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const cardElement = this.createCardElement(card, i);
      this.elements.playerHand.appendChild(cardElement);

      // FIXED: Restore selection state if this card is selected
      if (this.game.selectedCard && this.game.selectedCard.id === card.id) {
        cardElement.classList.add("selected");
        this.selectedCardElement = cardElement;
      }
    }
  }

  /**
   * Create a card element - FIXED
   * @param {Card} card - Card to create element for
   * @param {number} index - Index in hand
   * @returns {HTMLElement} Card element
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

    // Add click listener
    cardElement.addEventListener("click", () => {
      this.handleCardSelection(card);
    });

    // Add hover effects
    cardElement.addEventListener("mouseenter", () => {
      this.handleCardHover(card, true);
    });

    cardElement.addEventListener("mouseleave", () => {
      this.handleCardHover(card, false);
    });

    return cardElement;
  }

  // Challenge event handlers - FIXED

  onChallengeWindowOpen(data) {
    if (DEBUG.ENABLED) {
      console.log("Challenge window opened", data);
    }

    // FIXED: Show clear message about challenge opportunity
    this.addLogMessage(
      "💭 Challenge opportunity! Click the Challenge button if you think the AI is bluffing!",
      "highlight"
    );

    // Force UI update to show challenge button
    this.updateUI();
  }

  onChallengeWindowClosed(data) {
    if (DEBUG.ENABLED) {
      console.log("Challenge window closed", data);
    }

    this.addLogMessage("Challenge window closed.", "normal");
    this.updateUI();
  }

  onChallengeMade(data) {
    const challengerName =
      data.challenger.type === PLAYER_TYPES.HUMAN ? "You" : "AI";

    // FIXED: Better challenge result messaging
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

  /**
   * Clear card selection - FIXED
   */
  clearCardSelection() {
    // FIXED: Remove selected class from all cards, not just tracked element
    const allCards = this.elements.playerHand.querySelectorAll(".hand-card");
    allCards.forEach((card) => card.classList.remove("selected"));

    this.selectedCardElement = null;
  }

  /**
   * Find card element by ID - FIXED
   * @param {string} cardId - Card ID to find
   * @returns {HTMLElement|null} Card element or null
   */
  findCardElement(cardId) {
    return this.elements.playerHand.querySelector(`[data-card-id="${cardId}"]`);
  }

  // ... (rest of the methods remain the same)

  /**
   * Update action buttons state
   * @param {Object} gameState - Current game state
   */
  updateActionButtons(gameState) {
    const canPlay =
      gameState.currentPlayer &&
      gameState.currentPlayer.type === PLAYER_TYPES.HUMAN &&
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
      gameState.currentPlayer &&
      gameState.currentPlayer.type === PLAYER_TYPES.HUMAN &&
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
   * Handle challenge attempt - FIXED
   */
  handleChallenge() {
    if (DEBUG.ENABLED) {
      console.log("Challenge button clicked");
    }

    eventBus.emit("ui:challenge_made");

    // Provide immediate feedback
    this.addLogMessage("🎯 You challenged the AI's claim!", "action");
  }

  /**
   * Update scores
   */
  updateScores() {
    if (this.game && this.game.humanPlayer && this.game.aiPlayer) {
      if (this.elements.playerScore) {
        this.elements.playerScore.textContent = this.game.humanPlayer.score;
      }
      if (this.elements.aiScore) {
        this.elements.aiScore.textContent = this.game.aiPlayer.score;
      }
    }
  }

  /**
   * Update turn indicator
   * @param {Object} gameState - Current game state
   */
  updateTurnIndicator(gameState) {
    if (!this.elements.turnIndicator) return;

    let text = "Game Setup";

    if (gameState.currentPlayer) {
      if (gameState.currentPlayer.type === PLAYER_TYPES.HUMAN) {
        text = "Your Turn";
      } else {
        text = "AI Turn";
      }

      // FIXED: Better challenge window indication
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
   * @param {number} roundNumber - Current round number
   */
  updateRoundCounter(roundNumber) {
    if (this.elements.roundCounter) {
      this.elements.roundCounter.textContent = `Round ${roundNumber}`;
    }
  }

  /**
   * Update grid display
   */
  updateGrid() {
    if (!this.elements.gameGrid || !this.game) return;

    const gridPositions = this.elements.gameGrid.children;

    for (let i = 0; i < gridPositions.length; i++) {
      const positionElement = gridPositions[i];
      const card = this.game.gridSystem.getCardAt(i);

      // Clear existing content
      positionElement.innerHTML = "";
      positionElement.className = "grid-position";

      if (card) {
        // Add occupied class
        positionElement.classList.add("occupied");

        // Create card display
        const gridCard = document.createElement("div");
        gridCard.className = "grid-card";

        const cardType = document.createElement("div");
        cardType.className = "card-type";
        cardType.textContent = CARD_INFO[card.claimedType || card.type].icon;

        const cardOwner = document.createElement("div");
        cardOwner.className = "card-owner";
        cardOwner.textContent = card.owner
          ? card.owner.type === PLAYER_TYPES.HUMAN
            ? "You"
            : "AI"
          : "?";

        gridCard.appendChild(cardType);
        gridCard.appendChild(cardOwner);
        positionElement.appendChild(gridCard);

        // Add owner-specific styling
        if (card.owner && card.owner.type === PLAYER_TYPES.HUMAN) {
          positionElement.classList.add("player-card");
        } else if (card.owner && card.owner.type === PLAYER_TYPES.AI) {
          positionElement.classList.add("ai-card");
        }

        // Show revealed state
        if (card.isRevealed) {
          positionElement.classList.add("revealed");
          if (card.isBluffing()) {
            positionElement.classList.add("was-bluff");
          }
        }
      }

      // Handle selection state
      if (i === this.game.selectedPosition) {
        positionElement.classList.add("selected");
      }
    }
  }

  // Additional methods...
  handlePositionSelection(position) {
    if (!this.game || !this.game.gridSystem.isPositionAvailable(position)) {
      return;
    }

    eventBus.emit("ui:position_selected", { position });

    // Update visual selection
    this.clearPositionSelection();
    const positionElement = this.elements.gameGrid.children[position];
    if (positionElement) {
      positionElement.classList.add("selected");
      this.selectedPositionElement = positionElement;
    }

    this.updateUI();
  }

  handleClaimSelection(claimedType) {
    eventBus.emit("ui:claim_selected", { claimedType });
    this.updateUI();
  }

  handlePlayConfirmation() {
    eventBus.emit("ui:play_confirmed");
    this.clearSelections();
    this.updateUI();
  }

  handlePlayCancellation() {
    eventBus.emit("ui:play_cancelled");
    this.clearSelections();
    this.updateUI();
  }

  handlePauseToggle() {
    if (this.game) {
      if (this.game.isPaused) {
        this.game.resumeGame();
      } else {
        this.game.pauseGame();
      }
    }
  }

  handleKeyPress(event) {
    switch (event.key) {
      case "Escape":
        this.handlePlayCancellation();
        this.hideModal();
        break;
      case "Enter":
        if (!this.elements.confirmPlay?.disabled) {
          this.handlePlayConfirmation();
        }
        break;
      case " ":
        if (
          !this.elements.challengeBtn?.disabled &&
          this.elements.challengeBtn?.style.display !== "none"
        ) {
          event.preventDefault();
          this.handleChallenge();
        }
        break;
      case "p":
      case "P":
        this.handlePauseToggle();
        break;
    }
  }

  handlePositionHover(position, isEntering) {
    const positionElement = this.elements.gameGrid.children[position];
    if (!positionElement) return;

    if (
      isEntering &&
      this.game &&
      this.game.gridSystem.isPositionAvailable(position)
    ) {
      positionElement.classList.add("hover");
      this.hoveredElements.add(positionElement);
    } else {
      positionElement.classList.remove("hover");
      this.hoveredElements.delete(positionElement);
    }
  }

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

  // Game event handlers
  onGameStart(data) {
    this.addLogMessage("Game started! Place your cards strategically.");
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
    this.showGameEndModal(data);
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

  onBattleStart(data) {
    this.addLogMessage("Battle phase started!");
  }

  onBattleResult(data) {
    if (data.explanation) {
      this.addLogMessage(`Battle: ${data.explanation}`);
    }
  }

  onBattleEnd(data) {
    this.addLogMessage(
      `Battle phase complete. ${data.results.length} battles resolved.`
    );
    this.updateUI();
  }

  onScoreUpdate(data) {
    this.updateScores();
    if (data.pointsAdded > 0) {
      const playerName = data.player.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
      this.addLogMessage(
        `${playerName} scored ${data.pointsAdded} point${
          data.pointsAdded === 1 ? "" : "s"
        }!`
      );
    }
  }

  onError(data) {
    console.error("Game error:", data.error);
    this.addLogMessage("An error occurred. Please try again.", "error");
  }

  // Utility methods
  clearSelections() {
    this.clearCardSelection();
    this.clearPositionSelection();
  }

  clearPositionSelection() {
    if (this.selectedPositionElement) {
      this.selectedPositionElement.classList.remove("selected");
      this.selectedPositionElement = null;
    }
  }

  /**
   * Add message to game log
   * @param {string} message - Message to add
   * @param {string} type - Message type ('normal', 'highlight', 'error')
   */
  addLogMessage(message, type = "normal") {
    if (!this.elements.gameLog) return;

    const logEntry = document.createElement("div");
    logEntry.className = "log-entry";
    logEntry.textContent = message;

    if (type === "highlight") {
      logEntry.classList.add("highlight");
    } else if (type === "error") {
      logEntry.classList.add("error");
    } else if (type === "challenge") {
      logEntry.classList.add("challenge");
    } else if (type === "action") {
      logEntry.classList.add("action");
    }

    this.elements.gameLog.appendChild(logEntry);

    // Keep log manageable
    while (this.elements.gameLog.children.length > 50) {
      this.elements.gameLog.removeChild(this.elements.gameLog.firstChild);
    }

    // Scroll to bottom
    this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.remove("hidden");
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.add("hidden");
    }
  }

  /**
   * Show modal with content
   * @param {string} title - Modal title
   * @param {string} content - Modal content (HTML)
   */
  showModal(title, content) {
    if (!this.elements.modalOverlay || !this.elements.modalContent) return;

    this.elements.modalContent.innerHTML = `
            <h2>${title}</h2>
            <div class="modal-body">${content}</div>
            <button class="secondary-btn" onclick="uiManager.hideModal()">Close</button>
        `;

    this.elements.modalOverlay.classList.remove("hidden");
  }

  /**
   * Hide modal
   */
  hideModal() {
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.classList.add("hidden");
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
                    ${
                      isPlayerWinner
                        ? "🎉 Congratulations! 🎉"
                        : "💻 AI Wins! 💻"
                    }
                </div>
                <div class="final-scores">
                    <h3>Final Scores</h3>
                    <div class="score-line">You: ${
                      gameData.finalScores.human
                    }</div>
                    <div class="score-line">AI: ${gameData.finalScores.ai}</div>
                </div>
                <div class="game-stats">
                    <p>Rounds Played: ${gameData.roundsPlayed}</p>
                    <p>Total Moves: ${gameData.totalMoves}</p>
                    <p>Game Duration: ${Math.round(
                      gameData.gameDuration / 1000
                    )}s</p>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn" onclick="location.reload()">New Game</button>
                </div>
            </div>
        `;

    this.showModal("Game Over", content);
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
                    <button class="primary-btn" onclick="uiManager.saveSettings()">Save Settings</button>
                    <button class="secondary-btn" onclick="uiManager.hideModal()">Cancel</button>
                </div>
            </div>
        `;

    this.showModal("Settings", content);
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

    if (challengeTimeSelect && this.game && this.game.challengeSystem) {
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

    this.addLogMessage("Settings saved successfully!", "highlight");
    this.hideModal();
  }

  /**
   * Start new game with UI initialization
   */
  async startNewGame() {
    try {
      this.showLoadingScreen();
      this.clearSelections();

      // Initialize new game
      if (this.game) {
        await this.game.initializeGame({
          playerName: "Player",
        });
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
   * @returns {boolean} True if UI state is valid
   */
  validate() {
    // Check if essential elements exist
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

    // Check if grid has correct number of positions
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
    // Clear all selections
    this.clearSelections();

    // Clear hovered elements
    this.hoveredElements.clear();

    // Hide any modals
    this.hideModal();

    // Clear animation queue
    this.animationQueue = [];
    this.isAnimating = false;

    // Remove event listeners (they'll be garbage collected with elements)
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

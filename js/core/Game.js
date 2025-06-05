/**
 * Bluff Battle - Main Game Controller
 * Orchestrates all game systems and manages game state
 */

class Game {
  constructor() {
    // Core game state
    this.gameState = GAME_STATES.MENU;
    this.turnPhase = TURN_PHASES.SETUP;
    this.currentPlayer = null;
    this.roundNumber = 1;
    this.isGameActive = false;
    this.isPaused = false;

    // Players
    this.humanPlayer = null;
    this.aiPlayer = null;
    this.players = [];

    // Game systems
    this.gridSystem = new GridSystem();
    this.battleSystem = new BattleSystem(this.gridSystem);
    this.challengeSystem = new ChallengeSystem();

    // UI and interaction state
    this.selectedCard = null;
    this.selectedPosition = null;
    this.pendingClaim = null;
    this.waitingForChallenge = false;

    // Game history and statistics
    this.gameHistory = [];
    this.gameStartTime = null;
    this.totalMoves = 0;

    // Event listeners
    this.setupEventListeners();

    if (DEBUG.ENABLED) {
      console.log("Game controller initialized");
    }
  }

  /**
   * Initialize a new game
   * @param {Object} options - Game configuration options
   */
  async initializeGame(options = {}) {
    try {
      this.gameState = GAME_STATES.LOADING;

      // Create players
      this.humanPlayer = new Player(
        "human",
        options.playerName || "Player",
        PLAYER_TYPES.HUMAN
      );
      this.aiPlayer = new Player("ai", "AI Opponent", PLAYER_TYPES.AI);
      this.players = [this.humanPlayer, this.aiPlayer];

      // Set starting player (human goes first)
      this.currentPlayer = this.humanPlayer;
      this.humanPlayer.isActive = true;

      // Initialize game systems
      this.gridSystem.clear();
      this.battleSystem.clear();
      this.challengeSystem.clear();

      // Reset game state
      this.roundNumber = 1;
      this.totalMoves = 0;
      this.gameStartTime = Date.now();
      this.gameHistory = [];

      this.gameState = GAME_STATES.PLAYING;
      this.isGameActive = true;

      if (DEBUG.ENABLED) {
        console.log(
          "Game initialized with players:",
          this.players.map((p) => p.name)
        );
      }

      eventBus.emit(EVENTS.GAME_START, {
        players: this.players,
        roundNumber: this.roundNumber,
      });

      // Start the first round
      await this.startNewRound();
    } catch (error) {
      console.error("Failed to initialize game:", error);
      this.gameState = GAME_STATES.MENU;
      throw error;
    }
  }

  /**
   * Start a new round
   */
  async startNewRound() {
    if (!this.isGameActive) return;

    try {
      this.turnPhase = TURN_PHASES.SETUP;

      // Clear previous round
      this.gridSystem.clear();
      this.battleSystem.clear();
      this.challengeSystem.clear();

      // Reset player states for new round
      for (const player of this.players) {
        player.resetForNewRound();
      }

      // Deal new hands
      const humanHand = cardFactory.createHand(
        GAME_CONFIG.CARDS_PER_HAND,
        true
      );
      const aiHand = cardFactory.createHand(GAME_CONFIG.CARDS_PER_HAND, true);

      this.humanPlayer.dealCards(humanHand);
      this.aiPlayer.dealCards(aiHand);

      // Clear interaction state
      this.selectedCard = null;
      this.selectedPosition = null;
      this.pendingClaim = null;
      this.waitingForChallenge = false;

      if (DEBUG.ENABLED) {
        console.log(`Round ${this.roundNumber} started`);
        console.log("Human hand:", humanHand.map((c) => c.type).join(", "));
        console.log("AI hand:", aiHand.map((c) => c.type).join(", "));
      }

      eventBus.emit(EVENTS.ROUND_START, {
        roundNumber: this.roundNumber,
        players: this.players,
      });

      // Start placement phase
      this.turnPhase = TURN_PHASES.PLACEMENT;
      await this.startTurn();
    } catch (error) {
      console.error("Failed to start new round:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Start a player's turn
   */
  async startTurn() {
    if (!this.isGameActive || this.isPaused) return;

    try {
      if (DEBUG.ENABLED) {
        console.log(`${this.currentPlayer.name}'s turn`);
      }

      eventBus.emit(EVENTS.TURN_START, {
        player: this.currentPlayer,
        phase: this.turnPhase,
      });

      // Check if current player can make a move
      if (!this.currentPlayer.canMove()) {
        await this.endTurn();
        return;
      }

      // Handle AI turn
      if (this.currentPlayer.type === PLAYER_TYPES.AI) {
        await this.handleAITurn();
      }
      // Human turn is handled by UI interactions
    } catch (error) {
      console.error("Failed to start turn:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Handle AI player's turn
   */
  async handleAITurn() {
    // Add small delay for better UX
    await this.delay(1000);

    try {
      // AI selects a card and position
      const aiDecision = this.makeAIDecision();

      if (aiDecision) {
        const { card, position, claimedType } = aiDecision;

        // Execute AI's play
        await this.executePlay(card, position, claimedType);
      } else {
        // AI can't make a valid move
        await this.endTurn();
      }
    } catch (error) {
      console.error("AI turn failed:", error);
      await this.endTurn();
    }
  }

  /**
   * Make AI decision for card placement
   * @returns {Object|null} AI decision or null if no valid move
   */
  makeAIDecision() {
    const aiHand = this.aiPlayer.hand;
    const emptyPositions = this.gridSystem.getEmptyPositions();

    if (aiHand.length === 0 || emptyPositions.length === 0) {
      return null;
    }

    // Simple AI strategy for now
    let bestOption = null;
    let bestScore = -Infinity;

    for (const card of aiHand) {
      for (const position of emptyPositions) {
        const score = this.battleSystem.calculateExpectedScore(
          position,
          card,
          this.aiPlayer
        );

        if (score > bestScore) {
          bestScore = score;
          bestOption = {
            card: card,
            position: position,
            claimedType: this.aiPlayer.shouldBluff()
              ? this.getRandomCardType(card.type)
              : card.type,
          };
        }
      }
    }

    return bestOption;
  }

  /**
   * Get a random card type different from the given type (for bluffing)
   * @param {string} excludeType - Type to exclude
   * @returns {string} Random card type
   */
  getRandomCardType(excludeType = null) {
    const types = Object.values(CARD_TYPES);
    const availableTypes = excludeType
      ? types.filter((t) => t !== excludeType)
      : types;
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  /**
   * Execute a card play
   * @param {Card} card - Card to play
   * @param {number} position - Position to play at
   * @param {string} claimedType - Claimed card type
   */
  async executePlay(card, position, claimedType) {
    try {
      // Validate the play
      if (!this.validatePlay(card, position, claimedType)) {
        throw new Error("Invalid play");
      }

      // Place the card
      this.gridSystem.placeCard(card, position);
      this.currentPlayer.playCard(card, position, claimedType);

      this.totalMoves++;

      // Register the play for potential challenges
      this.challengeSystem.registerPlay(
        card,
        this.currentPlayer,
        claimedType,
        position
      );

      if (DEBUG.ENABLED) {
        console.log(
          `${this.currentPlayer.name} played ${claimedType} at position ${position} (actually ${card.type})`
        );
      }

      eventBus.emit(EVENTS.PLAY_CONFIRMED, {
        player: this.currentPlayer,
        card: card,
        position: position,
        claimedType: claimedType,
      });

      // For AI plays, give human a chance to challenge
      if (this.currentPlayer.type === PLAYER_TYPES.AI) {
        this.waitingForChallenge = true;
        // Wait for challenge window or timeout
        await this.waitForChallengeOrTimeout();
      }

      // End turn
      await this.endTurn();
    } catch (error) {
      console.error("Failed to execute play:", error);
      throw error;
    }
  }

  /**
   * Wait for challenge or timeout
   */
  async waitForChallengeOrTimeout() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.waitingForChallenge = false;
        resolve();
      }, this.challengeSystem.challengeTimeWindow);

      // Listen for challenge
      const challengeListener = eventBus.once(EVENTS.CHALLENGE_MADE, () => {
        clearTimeout(timeout);
        this.waitingForChallenge = false;
        resolve();
      });

      // Listen for challenge window close
      const windowCloseListener = eventBus.once(
        EVENTS.CHALLENGE_WINDOW_CLOSED,
        () => {
          clearTimeout(timeout);
          this.waitingForChallenge = false;
          resolve();
        }
      );
    });
  }

  /**
   * Validate a card play
   * @param {Card} card - Card to validate
   * @param {number} position - Position to validate
   * @param {string} claimedType - Claimed type to validate
   * @returns {boolean} True if play is valid
   */
  validatePlay(card, position, claimedType) {
    // Check if it's the right player's turn
    if (!this.currentPlayer.hand.includes(card)) {
      return false;
    }

    // Check if position is available
    if (!this.gridSystem.isPositionAvailable(position)) {
      return false;
    }

    // Check if claimed type is valid
    if (!Object.values(CARD_TYPES).includes(claimedType)) {
      return false;
    }

    // Check game state
    if (
      this.gameState !== GAME_STATES.PLAYING ||
      this.turnPhase !== TURN_PHASES.PLACEMENT
    ) {
      return false;
    }

    return true;
  }

  /**
   * Handle a challenge attempt
   * @param {Player} challenger - Player making the challenge
   * @returns {boolean} True if challenge was processed
   */
  async handleChallenge(challenger) {
    try {
      const challengeResult = this.challengeSystem.makeChallenge(challenger);

      if (!challengeResult.success) {
        if (DEBUG.ENABLED) {
          console.log("Challenge attempt failed:", challengeResult.error);
        }
        return false;
      }

      const result = challengeResult.result;

      if (DEBUG.ENABLED) {
        console.log("Challenge result:", result.explanation);
      }

      // Update UI to show challenge result
      eventBus.emit(EVENTS.CHALLENGE_MADE, {
        challenger: challenger,
        result: result,
      });

      return true;
    } catch (error) {
      console.error("Failed to handle challenge:", error);
      return false;
    }
  }

  /**
   * End the current turn
   */
  async endTurn() {
    try {
      eventBus.emit(EVENTS.TURN_END, {
        player: this.currentPlayer,
      });

      // Check if placement phase is complete
      if (this.isPlacementPhaseComplete()) {
        await this.startBattlePhase();
      } else {
        // Switch to next player
        this.switchPlayer();
        await this.startTurn();
      }
    } catch (error) {
      console.error("Failed to end turn:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Check if placement phase is complete
   * @returns {boolean} True if all cards are placed
   */
  isPlacementPhaseComplete() {
    return this.players.every((player) => player.hand.length === 0);
  }

  /**
   * Switch to the next player
   */
  switchPlayer() {
    this.currentPlayer.isActive = false;

    if (this.currentPlayer === this.humanPlayer) {
      this.currentPlayer = this.aiPlayer;
    } else {
      this.currentPlayer = this.humanPlayer;
    }

    this.currentPlayer.isActive = true;

    if (DEBUG.ENABLED) {
      console.log(`Switched to ${this.currentPlayer.name}`);
    }
  }

  /**
   * Start the battle phase
   */
  async startBattlePhase() {
    try {
      this.turnPhase = TURN_PHASES.BATTLE;

      if (DEBUG.ENABLED) {
        console.log("Starting battle phase");
        console.log(this.gridSystem.toAscii());
      }

      eventBus.emit(EVENTS.PHASE_CHANGE, {
        oldPhase: TURN_PHASES.PLACEMENT,
        newPhase: TURN_PHASES.BATTLE,
      });

      // Resolve all battles
      const battleResults = await this.battleSystem.resolveAllBattles();

      if (DEBUG.ENABLED) {
        console.log(
          `Battle phase complete: ${battleResults.length} battles resolved`
        );
      }

      // Start scoring phase
      await this.startScoringPhase();
    } catch (error) {
      console.error("Battle phase failed:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Start the scoring phase
   */
  async startScoringPhase() {
    try {
      this.turnPhase = TURN_PHASES.SCORING;

      eventBus.emit(EVENTS.PHASE_CHANGE, {
        oldPhase: TURN_PHASES.BATTLE,
        newPhase: TURN_PHASES.SCORING,
      });

      // Check victory conditions
      const winner = this.checkVictoryConditions();

      if (winner) {
        await this.endGame(winner);
      } else {
        await this.endRound();
      }
    } catch (error) {
      console.error("Scoring phase failed:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Check victory conditions
   * @returns {Player|null} Winner or null if no winner yet
   */
  checkVictoryConditions() {
    // Check if any player has reached victory points with required lead
    if (this.humanPlayer.hasWon(this.aiPlayer)) {
      return this.humanPlayer;
    }

    if (this.aiPlayer.hasWon(this.humanPlayer)) {
      return this.aiPlayer;
    }

    return null;
  }

  /**
   * End the current round
   */
  async endRound() {
    try {
      // Update round winner
      const roundWinner =
        this.humanPlayer.score > this.aiPlayer.score
          ? this.humanPlayer
          : this.aiPlayer.score > this.humanPlayer.score
          ? this.aiPlayer
          : null;

      if (roundWinner) {
        roundWinner.stats.roundsWon++;
      }

      if (DEBUG.ENABLED) {
        console.log(`Round ${this.roundNumber} ended`);
        console.log(
          `Scores - ${this.humanPlayer.name}: ${this.humanPlayer.score}, ${this.aiPlayer.name}: ${this.aiPlayer.score}`
        );
      }

      eventBus.emit(EVENTS.ROUND_END, {
        roundNumber: this.roundNumber,
        winner: roundWinner,
        scores: {
          human: this.humanPlayer.score,
          ai: this.aiPlayer.score,
        },
      });

      // Start next round
      this.roundNumber++;
      await this.startNewRound();
    } catch (error) {
      console.error("Failed to end round:", error);
      this.handleGameError(error);
    }
  }

  /**
   * End the game
   * @param {Player} winner - The winning player
   */
  async endGame(winner) {
    try {
      this.isGameActive = false;
      this.gameState = GAME_STATES.GAME_OVER;

      // Update winner statistics
      winner.stats.gamesWon++;

      // Update all players' games played
      for (const player of this.players) {
        player.stats.gamesPlayed++;
      }

      const gameData = {
        winner: winner,
        loser: winner === this.humanPlayer ? this.aiPlayer : this.humanPlayer,
        finalScores: {
          human: this.humanPlayer.score,
          ai: this.aiPlayer.score,
        },
        roundsPlayed: this.roundNumber,
        totalMoves: this.totalMoves,
        gameDuration: Date.now() - this.gameStartTime,
      };

      if (DEBUG.ENABLED) {
        console.log(`Game ended! Winner: ${winner.name}`);
        console.log("Final scores:", gameData.finalScores);
      }

      eventBus.emit(EVENTS.GAME_END, gameData);
    } catch (error) {
      console.error("Failed to end game:", error);
      this.handleGameError(error);
    }
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (this.isGameActive && !this.isPaused) {
      this.isPaused = true;
      this.gameState = GAME_STATES.PAUSED;

      eventBus.emit(EVENTS.GAME_PAUSE, {
        pausedAt: Date.now(),
      });

      if (DEBUG.ENABLED) {
        console.log("Game paused");
      }
    }
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (this.isGameActive && this.isPaused) {
      this.isPaused = false;
      this.gameState = GAME_STATES.PLAYING;

      eventBus.emit(EVENTS.GAME_RESUME, {
        resumedAt: Date.now(),
      });

      if (DEBUG.ENABLED) {
        console.log("Game resumed");
      }
    }
  }

  /**
   * Handle player actions (called by UI)
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  async handlePlayerAction(action, data) {
    if (!this.isGameActive || this.isPaused) return;

    try {
      switch (action) {
        case PLAYER_ACTIONS.SELECT_CARD:
          return this.handleCardSelection(data.card);

        case PLAYER_ACTIONS.SELECT_POSITION:
          return this.handlePositionSelection(data.position);

        case PLAYER_ACTIONS.MAKE_CLAIM:
          return this.handleClaimSelection(data.claimedType);

        case PLAYER_ACTIONS.CONFIRM_PLAY:
          return await this.handlePlayConfirmation();

        case PLAYER_ACTIONS.CANCEL_PLAY:
          return this.handlePlayCancellation();

        case PLAYER_ACTIONS.CHALLENGE_CLAIM:
          return await this.handleChallenge(this.humanPlayer);

        default:
          console.warn("Unknown player action:", action);
          return false;
      }
    } catch (error) {
      console.error("Failed to handle player action:", error);
      return false;
    }
  }

  /**
   * Handle card selection
   * @param {Card} card - Selected card
   * @returns {boolean} True if selection was valid
   */
  handleCardSelection(card) {
    if (
      this.currentPlayer !== this.humanPlayer ||
      this.turnPhase !== TURN_PHASES.PLACEMENT
    ) {
      return false;
    }

    this.selectedCard = this.humanPlayer.selectCard(card.id);
    this.selectedPosition = null;
    this.pendingClaim = null;

    return this.selectedCard !== null;
  }

  /**
   * Handle position selection
   * @param {number} position - Selected position
   * @returns {boolean} True if selection was valid
   */
  handlePositionSelection(position) {
    if (this.currentPlayer !== this.humanPlayer || !this.selectedCard) {
      return false;
    }

    if (this.gridSystem.isPositionAvailable(position)) {
      this.selectedPosition = position;
      return true;
    }

    return false;
  }

  /**
   * Handle claim selection
   * @param {string} claimedType - Claimed card type
   * @returns {boolean} True if claim was valid
   */
  handleClaimSelection(claimedType) {
    if (this.currentPlayer !== this.humanPlayer || !this.selectedCard) {
      return false;
    }

    if (Object.values(CARD_TYPES).includes(claimedType)) {
      this.pendingClaim = claimedType;
      return true;
    }

    return false;
  }

  /**
   * Handle play confirmation
   * @returns {boolean} True if play was executed
   */
  async handlePlayConfirmation() {
    if (
      this.currentPlayer !== this.humanPlayer ||
      !this.selectedCard ||
      this.selectedPosition === null ||
      !this.pendingClaim
    ) {
      return false;
    }

    try {
      await this.executePlay(
        this.selectedCard,
        this.selectedPosition,
        this.pendingClaim
      );

      // Clear selections
      this.selectedCard = null;
      this.selectedPosition = null;
      this.pendingClaim = null;

      return true;
    } catch (error) {
      console.error("Failed to confirm play:", error);
      return false;
    }
  }

  /**
   * Handle play cancellation
   * @returns {boolean} Always true
   */
  handlePlayCancellation() {
    if (this.selectedCard) {
      this.humanPlayer.deselectCard();
    }

    this.selectedCard = null;
    this.selectedPosition = null;
    this.pendingClaim = null;

    return true;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for system events
    eventBus.on(EVENTS.ERROR, (error) => {
      this.handleGameError(error);
    });

    // Listen for UI events (will be implemented by UIManager)
    eventBus.on("ui:card_selected", (data) => {
      this.handlePlayerAction(PLAYER_ACTIONS.SELECT_CARD, data);
    });

    eventBus.on("ui:position_selected", (data) => {
      this.handlePlayerAction(PLAYER_ACTIONS.SELECT_POSITION, data);
    });

    eventBus.on("ui:claim_selected", (data) => {
      this.handlePlayerAction(PLAYER_ACTIONS.MAKE_CLAIM, data);
    });

    eventBus.on("ui:play_confirmed", () => {
      this.handlePlayerAction(PLAYER_ACTIONS.CONFIRM_PLAY, {});
    });

    eventBus.on("ui:play_cancelled", () => {
      this.handlePlayerAction(PLAYER_ACTIONS.CANCEL_PLAY, {});
    });

    eventBus.on("ui:challenge_made", () => {
      this.handlePlayerAction(PLAYER_ACTIONS.CHALLENGE_CLAIM, {});
    });
  }

  /**
   * Handle game errors
   * @param {Error} error - Error to handle
   */
  handleGameError(error) {
    console.error("Game error:", error);

    // Emit error event for UI handling
    eventBus.emit(EVENTS.ERROR, {
      error: error,
      gameState: this.gameState,
      timestamp: Date.now(),
    });

    // For critical errors, pause the game
    if (this.isGameActive && !this.isPaused) {
      this.pauseGame();
    }
  }

  /**
   * Get current game state for UI updates
   * @returns {Object} Current game state
   */
  getGameState() {
    return {
      gameState: this.gameState,
      turnPhase: this.turnPhase,
      currentPlayer: this.currentPlayer,
      roundNumber: this.roundNumber,
      isGameActive: this.isGameActive,
      isPaused: this.isPaused,
      players: this.players,
      selectedCard: this.selectedCard,
      selectedPosition: this.selectedPosition,
      pendingClaim: this.pendingClaim,
      waitingForChallenge: this.waitingForChallenge,
      totalMoves: this.totalMoves,
      canChallenge: this.challengeSystem.canChallenge(),
      challengeablePlay: this.challengeSystem.getChallengeablePlay(),
    };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.isGameActive = false;
    this.gameState = GAME_STATES.MENU;

    // Clear all systems
    this.gridSystem.clear();
    this.battleSystem.clear();
    this.challengeSystem.clear();

    // Clear all timers and listeners
    eventBus.clear();

    if (DEBUG.ENABLED) {
      console.log("Game destroyed");
    }
  }
}

// Add simple AI decision making helper to Player class
Player.prototype.shouldBluff = function () {
  // Simple bluffing logic - can be enhanced later
  if (this.type !== PLAYER_TYPES.AI) {
    return false; // Only AI should use this method
  }

  const bluffRate = 0.3; // 30% chance to bluff
  const randomValue = Math.random();

  // Adjust bluff rate based on behavior profile if available
  if (
    this.behaviorProfile &&
    this.behaviorProfile.bluffingFrequency !== undefined
  ) {
    const adjustedRate = Math.min(
      0.5,
      bluffRate + this.behaviorProfile.bluffingFrequency * 0.1
    );
    return randomValue < adjustedRate;
  }

  return randomValue < bluffRate;
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Game;
}

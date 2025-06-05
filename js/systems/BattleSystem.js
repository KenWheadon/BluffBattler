/**
 * Bluff Battle - Battle System
 * Handles combat resolution, advancement, and scoring
 */

class BattleSystem {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
    this.battleQueue = [];
    this.battleResults = [];
    this.currentBattle = null;
    this.isProcessing = false;

    if (DEBUG.ENABLED) {
      console.log("BattleSystem initialized");
    }
  }

  /**
   * Process all battles on the grid sequentially
   * @returns {Promise<Array>} Array of battle results
   */
  async resolveAllBattles() {
    if (this.isProcessing) {
      console.warn("Battle resolution already in progress");
      return this.battleResults;
    }

    this.isProcessing = true;
    this.battleResults = [];
    this.battleQueue = [];

    try {
      // Find all battle pairs
      this.identifyBattles();

      // Safety check to prevent infinite processing
      const maxBattles = GAME_CONFIG.TOTAL_POSITIONS;
      if (this.battleQueue.length > maxBattles) {
        console.error("Too many battles detected, aborting");
        return this.battleResults;
      }

      // Process each battle with timeout protection
      for (let i = 0; i < this.battleQueue.length; i++) {
        const battle = this.battleQueue[i];
        const result = await Promise.race([
          this.processBattle(battle),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Battle timeout")), 5000)
          ),
        ]);

        this.battleResults.push(result);

        // Add delay for animation if not in debug mode
        if (!DEBUG.SKIP_ANIMATIONS) {
          await this.delay(ANIMATIONS.BATTLE_RESOLVE);
        }
      }

      // Process advancement for cards that didn't battle
      await this.processAdvancements();

      if (DEBUG.ENABLED) {
        console.log(
          `Battle resolution complete: ${this.battleResults.length} battles processed`
        );
      }

      eventBus.emit(EVENTS.BATTLE_END, {
        results: this.battleResults,
        totalBattles: this.battleQueue.length,
      });

      return this.battleResults;
    } catch (error) {
      console.error("Battle resolution failed:", error);
      return this.battleResults;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Identify all battles that need to be resolved
   */
  identifyBattles() {
    // Process positions sequentially for battles (as per game design)
    for (
      let position = 0;
      position < this.gridSystem.totalPositions - 1;
      position++
    ) {
      const card1 = this.gridSystem.getCardAt(position);
      const card2 = this.gridSystem.getCardAt(position + 1);

      if (card1 && card2) {
        // Check if this is a valid horizontal battle
        const coords1 = this.gridSystem.positionToCoords(position);
        const coords2 = this.gridSystem.positionToCoords(position + 1);

        if (coords1.row === coords2.row && coords2.col === coords1.col + 1) {
          this.battleQueue.push({
            position1: position,
            card1: card1,
            position2: position + 1,
            card2: card2,
            type: "horizontal",
          });
        }
      }
    }

    if (DEBUG.ENABLED) {
      console.log(`Identified ${this.battleQueue.length} battles`);
    }
  }

  /**
   * Process a single battle between two cards
   * @param {Object} battle - Battle configuration
   * @returns {Promise<Object>} Battle result
   */
  async processBattle(battle) {
    this.currentBattle = battle;
    const { card1, card2, position1, position2 } = battle;

    eventBus.emit(EVENTS.BATTLE_START, {
      battle: battle,
      card1: card1,
      card2: card2,
    });

    // Determine battle outcome based on actual card types (not claims)
    const battleResult = this.determineBattleOutcome(card1, card2);

    let winner = null;
    let loser = null;
    let points = 0;

    switch (battleResult.outcome) {
      case "card1_wins":
        winner = card1;
        loser = card2;
        points = SCORING.BATTLE_WIN;
        break;

      case "card2_wins":
        winner = card2;
        loser = card1;
        points = SCORING.BATTLE_WIN;
        break;

      case "tie":
        // Both cards remain, no points awarded
        break;
    }

    // Award points to winner's owner
    if (winner && winner.owner) {
      winner.owner.addScore(points);
    }

    // Update card battle histories
    const battleRecord = {
      timestamp: Date.now(),
      opponent: loser ? loser.id : card2.id,
      opponentType: loser ? loser.type : card2.type,
      result:
        winner === card1
          ? BATTLE_RESULTS.WIN
          : winner === card2
          ? BATTLE_RESULTS.LOSE
          : "tie",
      position: position1,
      opponentPosition: position2,
    };

    card1.battleHistory.push(battleRecord);
    card2.battleHistory.push({
      ...battleRecord,
      opponent: card1.id,
      opponentType: card1.type,
      result:
        winner === card2
          ? BATTLE_RESULTS.WIN
          : winner === card1
          ? BATTLE_RESULTS.LOSE
          : "tie",
      position: position2,
      opponentPosition: position1,
    });

    // Create result object
    const result = {
      battle: battle,
      outcome: battleResult.outcome,
      winner: winner,
      loser: loser,
      pointsAwarded: points,
      explanation: battleResult.explanation,
    };

    // Update player statistics
    if (winner && winner.owner) {
      winner.owner.stats.battlesWon++;
    }
    if (loser && loser.owner) {
      loser.owner.stats.battlesLost++;
    }

    if (DEBUG.ENABLED) {
      console.log(
        `Battle result: ${card1.type} vs ${card2.type} = ${battleResult.outcome}`
      );
    }

    eventBus.emit(EVENTS.BATTLE_RESULT, result);

    this.currentBattle = null;
    return result;
  }

  /**
   * Determine the outcome of a battle between two cards
   * @param {Card} card1 - First card
   * @param {Card} card2 - Second card
   * @returns {Object} Battle outcome and explanation
   */
  determineBattleOutcome(card1, card2) {
    const type1 = card1.type;
    const type2 = card2.type;

    if (type1 === type2) {
      return {
        outcome: "tie",
        explanation: `Both cards are ${CARD_INFO[type1].name} - tie!`,
      };
    }

    if (CARD_INFO[type1].defeats === type2) {
      return {
        outcome: "card1_wins",
        explanation: `${CARD_INFO[type1].name} defeats ${CARD_INFO[type2].name}`,
      };
    } else {
      return {
        outcome: "card2_wins",
        explanation: `${CARD_INFO[type2].name} defeats ${CARD_INFO[type1].name}`,
      };
    }
  }

  /**
   * Process advancement for cards that don't battle
   */
  async processAdvancements() {
    const allCards = this.gridSystem.getAllCards();
    const battlingPositions = new Set();

    // Collect all positions involved in battles
    for (const battle of this.battleQueue) {
      battlingPositions.add(battle.position1);
      battlingPositions.add(battle.position2);
    }

    // Find cards that can advance
    for (const { card, position } of allCards) {
      if (!battlingPositions.has(position)) {
        await this.processCardAdvancement(card, position);
      }
    }
  }

  /**
   * Process advancement for a single card
   * @param {Card} card - Card to process
   * @param {number} currentPosition - Card's current position
   */
  async processCardAdvancement(card, currentPosition) {
    const neighbors = this.gridSystem.getHorizontalNeighbors(currentPosition);
    let advanced = false;
    let points = 0;

    // Check for advancement to the right
    if (
      neighbors.right !== null &&
      this.gridSystem.isPositionAvailable(neighbors.right)
    ) {
      // Award advancement points
      points += SCORING.ADVANCEMENT;
      advanced = true;
    }

    // Check for control points (adjacent friendly cards)
    const adjacentPositions =
      this.gridSystem.getAdjacentPositions(currentPosition);
    let controlPoints = 0;

    for (const adjPos of adjacentPositions) {
      const adjCard = this.gridSystem.getCardAt(adjPos);
      if (adjCard && adjCard.owner === card.owner) {
        controlPoints += SCORING.CONTROL;
      }
    }

    const totalPoints = points + controlPoints;
    if (totalPoints > 0 && card.owner) {
      card.owner.addScore(totalPoints);
    }

    if (DEBUG.ENABLED && (advanced || controlPoints > 0)) {
      console.log(
        `${card.toString()} - Advanced: ${advanced}, Control: ${controlPoints}, Total points: ${totalPoints}`
      );
    }

    if (advanced || controlPoints > 0) {
      eventBus.emit(EVENTS.POINTS_AWARDED, {
        card: card,
        player: card.owner,
        advancement: advanced,
        controlPoints: controlPoints,
        totalPoints: totalPoints,
      });
    }
  }

  /**
   * Simulate a battle without actually executing it
   * @param {Card} card1 - First card
   * @param {Card} card2 - Second card
   * @returns {Object} Simulated battle result
   */
  simulateBattle(card1, card2) {
    return this.determineBattleOutcome(card1, card2);
  }

  /**
   * Get all possible battle outcomes for a position
   * @param {number} position - Position to analyze
   * @param {Card} newCard - Card being considered for placement
   * @returns {Array<Object>} Possible battle scenarios
   */
  analyzePotentialBattles(position, newCard) {
    const scenarios = [];
    const neighbors = this.gridSystem.getHorizontalNeighbors(position);

    // Check left neighbor
    if (neighbors.left !== null) {
      const leftCard = this.gridSystem.getCardAt(neighbors.left);
      if (leftCard) {
        const battleResult = this.simulateBattle(leftCard, newCard);
        scenarios.push({
          type: "left_battle",
          opponent: leftCard,
          position: neighbors.left,
          outcome:
            battleResult.outcome === "card2_wins"
              ? "win"
              : battleResult.outcome === "card1_wins"
              ? "lose"
              : "tie",
          explanation: battleResult.explanation,
        });
      }
    }

    // Check right neighbor
    if (neighbors.right !== null) {
      const rightCard = this.gridSystem.getCardAt(neighbors.right);
      if (rightCard) {
        const battleResult = this.simulateBattle(newCard, rightCard);
        scenarios.push({
          type: "right_battle",
          opponent: rightCard,
          position: neighbors.right,
          outcome:
            battleResult.outcome === "card1_wins"
              ? "win"
              : battleResult.outcome === "card2_wins"
              ? "lose"
              : "tie",
          explanation: battleResult.explanation,
        });
      }
    }

    return scenarios;
  }

  /**
   * Calculate expected score for placing a card at a position
   * @param {number} position - Position to analyze
   * @param {Card} card - Card to place
   * @param {Player} player - Player placing the card
   * @returns {number} Expected score change
   */
  calculateExpectedScore(position, card, player) {
    let expectedScore = 0;

    // Analyze potential battles
    const battles = this.analyzePotentialBattles(position, card);
    for (const battle of battles) {
      if (battle.outcome === "win") {
        expectedScore += SCORING.BATTLE_WIN;
      }
      // Note: We don't subtract for losses here as they don't cost points directly
    }

    // Check advancement potential
    const neighbors = this.gridSystem.getHorizontalNeighbors(position);
    if (
      neighbors.right !== null &&
      this.gridSystem.isPositionAvailable(neighbors.right)
    ) {
      expectedScore += SCORING.ADVANCEMENT;
    }

    // Check control points
    const adjacentPositions = this.gridSystem.getAdjacentPositions(position);
    for (const adjPos of adjacentPositions) {
      const adjCard = this.gridSystem.getCardAt(adjPos);
      if (adjCard && adjCard.owner === player) {
        expectedScore += SCORING.CONTROL;
      }
    }

    return expectedScore;
  }

  /**
   * Get battle statistics for analysis
   * @returns {Object} Battle statistics
   */
  getStatistics() {
    const stats = {
      totalBattles: this.battleResults.length,
      outcomes: {
        wins: 0,
        losses: 0,
        ties: 0,
      },
      cardTypePerformance: {},
      averagePointsPerBattle: 0,
      totalPointsAwarded: 0,
    };

    // Initialize card type performance tracking
    for (const type of Object.values(CARD_TYPES)) {
      stats.cardTypePerformance[type] = {
        battles: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winRate: 0,
      };
    }

    // Analyze battle results
    for (const result of this.battleResults) {
      const { card1, card2, outcome, pointsAwarded } = result.battle || result;

      stats.totalPointsAwarded += pointsAwarded || 0;

      // Track outcomes
      if (outcome === "tie") {
        stats.outcomes.ties++;
        stats.cardTypePerformance[card1.type].ties++;
        stats.cardTypePerformance[card2.type].ties++;
      } else if (outcome === "card1_wins") {
        stats.outcomes.wins++;
        stats.cardTypePerformance[card1.type].wins++;
        stats.cardTypePerformance[card2.type].losses++;
      } else if (outcome === "card2_wins") {
        stats.outcomes.wins++;
        stats.cardTypePerformance[card2.type].wins++;
        stats.cardTypePerformance[card1.type].losses++;
      }

      // Track battles per card type
      stats.cardTypePerformance[card1.type].battles++;
      stats.cardTypePerformance[card2.type].battles++;
    }

    // Calculate win rates
    for (const type of Object.values(CARD_TYPES)) {
      const performance = stats.cardTypePerformance[type];
      if (performance.battles > 0) {
        performance.winRate = performance.wins / performance.battles;
      }
    }

    if (stats.totalBattles > 0) {
      stats.averagePointsPerBattle =
        stats.totalPointsAwarded / stats.totalBattles;
    }

    return stats;
  }

  /**
   * Clear battle system state
   */
  clear() {
    this.battleQueue = [];
    this.battleResults = [];
    this.currentBattle = null;
    this.isProcessing = false;

    if (DEBUG.ENABLED) {
      console.log("BattleSystem cleared");
    }
  }

  /**
   * Utility function to create delays for animations
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current battle state for UI updates
   * @returns {Object} Current battle state
   */
  getCurrentState() {
    return {
      isProcessing: this.isProcessing,
      currentBattle: this.currentBattle,
      queueLength: this.battleQueue.length,
      completedBattles: this.battleResults.length,
    };
  }

  /**
   * Force stop battle processing (for game reset)
   */
  forceStop() {
    this.isProcessing = false;
    this.currentBattle = null;
    this.battleQueue = [];

    if (DEBUG.ENABLED) {
      console.log("BattleSystem force stopped");
    }
  }

  /**
   * Validate battle system state
   * @returns {boolean} True if state is valid
   */
  validate() {
    if (!this.gridSystem || !(this.gridSystem instanceof GridSystem)) {
      console.error("BattleSystem: Invalid grid system reference");
      return false;
    }

    // Check battle queue validity
    for (const battle of this.battleQueue) {
      if (
        !battle.card1 ||
        !battle.card2 ||
        typeof battle.position1 !== "number" ||
        typeof battle.position2 !== "number"
      ) {
        console.error("BattleSystem: Invalid battle in queue");
        return false;
      }
    }

    return true;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = BattleSystem;
}

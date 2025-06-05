/**
 * Bluff Battle - AI Player
 * Handles AI decision making and strategy
 */

class AIPlayer {
  constructor(player, difficulty = "medium") {
    this.player = player;
    this.difficulty =
      AI_DIFFICULTY[difficulty.toUpperCase()] || AI_DIFFICULTY.MEDIUM;
    this.memory = [];
    this.maxMemorySize = this.difficulty.memoryDepth;
    this.strategy = "balanced";
    this.decisionHistory = [];

    // AI personality traits
    this.traits = {
      aggression: 0.5,
      deception: this.difficulty.bluffRate,
      caution: 1 - this.difficulty.challengeRate,
      adaptability: this.difficulty.adaptationRate,
    };

    if (DEBUG.ENABLED) {
      console.log(
        `AIPlayer initialized with ${difficulty} difficulty`,
        this.difficulty
      );
    }
  }

  /**
   * Make a decision for card placement
   * @param {Object} gameState - Current game state
   * @param {GridSystem} gridSystem - Grid system reference
   * @param {BattleSystem} battleSystem - Battle system reference
   * @returns {Object|null} Decision object or null
   */
  makePlayDecision(gameState, gridSystem, battleSystem) {
    const hand = this.player.hand;
    const emptyPositions = gridSystem.getEmptyPositions();

    if (hand.length === 0 || emptyPositions.length === 0) {
      return null;
    }

    if (DEBUG.ENABLED) {
      console.log("AI making play decision...", {
        handSize: hand.length,
        emptyPositions: emptyPositions.length,
        strategy: this.strategy,
      });
    }

    // Analyze all possible plays
    const possiblePlays = this.analyzePossiblePlays(
      hand,
      emptyPositions,
      gridSystem,
      battleSystem
    );

    // Choose best play based on strategy
    const bestPlay = this.selectBestPlay(possiblePlays, gameState);

    if (bestPlay) {
      // Decide whether to bluff
      const shouldBluff = this.shouldBluff(bestPlay, gameState);
      const claimedType = shouldBluff
        ? this.chooseBestBluff(bestPlay.card)
        : bestPlay.card.type;

      const decision = {
        card: bestPlay.card,
        position: bestPlay.position,
        claimedType: claimedType,
        reasoning: bestPlay.reasoning,
        confidence: bestPlay.score,
        isBluff: shouldBluff,
      };

      // Remember this decision
      this.rememberDecision(decision, gameState);

      if (DEBUG.ENABLED) {
        console.log("AI decision:", {
          card: decision.card.type,
          position: decision.position,
          claim: decision.claimedType,
          isBluff: decision.isBluff,
          reasoning: decision.reasoning,
        });
      }

      return decision;
    }

    if (DEBUG.ENABLED) {
      console.log("AI could not make a decision");
    }

    return null;
  }

  /**
   * Analyze all possible plays
   * @param {Array<Card>} hand - AI's hand
   * @param {Array<number>} positions - Available positions
   * @param {GridSystem} gridSystem - Grid system
   * @param {BattleSystem} battleSystem - Battle system
   * @returns {Array<Object>} Analyzed plays
   */
  analyzePossiblePlays(hand, positions, gridSystem, battleSystem) {
    const plays = [];

    for (const card of hand) {
      for (const position of positions) {
        const analysis = this.analyzePlay(
          card,
          position,
          gridSystem,
          battleSystem
        );
        plays.push(analysis);
      }
    }

    // Sort by score (best first)
    return plays.sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze a specific play
   * @param {Card} card - Card to play
   * @param {number} position - Position to play at
   * @param {GridSystem} gridSystem - Grid system
   * @param {BattleSystem} battleSystem - Battle system
   * @returns {Object} Play analysis
   */
  analyzePlay(card, position, gridSystem, battleSystem) {
    let score = 0;
    const factors = [];

    // Base score from battle system
    const expectedScore = battleSystem.calculateExpectedScore(
      position,
      card,
      this.player
    );
    score += expectedScore;
    factors.push(`Base score: ${expectedScore}`);

    // Positional advantages
    const positionScore = this.evaluatePosition(position, gridSystem);
    score += positionScore;
    if (positionScore !== 0) {
      factors.push(`Position value: ${positionScore}`);
    }

    // Strategic considerations
    const strategicScore = this.evaluateStrategy(card, position, gridSystem);
    score += strategicScore;
    if (strategicScore !== 0) {
      factors.push(`Strategic value: ${strategicScore}`);
    }

    // Opponent disruption
    const disruptionScore = this.evaluateDisruption(card, position, gridSystem);
    score += disruptionScore;
    if (disruptionScore !== 0) {
      factors.push(`Disruption: ${disruptionScore}`);
    }

    // Risk assessment
    const riskPenalty = this.evaluateRisk(card, position, gridSystem);
    score -= riskPenalty;
    if (riskPenalty !== 0) {
      factors.push(`Risk penalty: -${riskPenalty}`);
    }

    return {
      card: card,
      position: position,
      score: score,
      reasoning: factors.join(", "),
      expectedOutcome: this.predictOutcome(card, position, gridSystem),
    };
  }

  /**
   * Evaluate position value
   * @param {number} position - Position to evaluate
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Position score
   */
  evaluatePosition(position, gridSystem) {
    let score = 0;

    // Center positions are generally better
    const coords = gridSystem.positionToCoords(position);
    const centerCol = Math.floor(gridSystem.width / 2);
    const centerRow = Math.floor(gridSystem.height / 2);

    const distanceFromCenter =
      Math.abs(coords.col - centerCol) + Math.abs(coords.row - centerRow);
    score += (gridSystem.width + gridSystem.height - distanceFromCenter) * 0.5;

    // Edge positions have defensive value
    const isEdge = gridSystem.isEdgePosition(position);
    if (isEdge.isEdge) {
      score += 1;
    }

    // Positions adjacent to friendly cards are valuable
    const adjacent = gridSystem.getAdjacentPositions(position);
    for (const adjPos of adjacent) {
      const adjCard = gridSystem.getCardAt(adjPos);
      if (adjCard && adjCard.owner === this.player) {
        score += 2; // Friendly adjacency bonus
      }
    }

    return score;
  }

  /**
   * Evaluate strategic value
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Strategic score
   */
  evaluateStrategy(card, position, gridSystem) {
    let score = 0;

    switch (this.strategy) {
      case "aggressive":
        score += this.evaluateAggressiveStrategy(card, position, gridSystem);
        break;
      case "defensive":
        score += this.evaluateDefensiveStrategy(card, position, gridSystem);
        break;
      case "balanced":
        score += this.evaluateBalancedStrategy(card, position, gridSystem);
        break;
    }

    return score;
  }

  /**
   * Evaluate aggressive strategy
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Aggressive strategy score
   */
  evaluateAggressiveStrategy(card, position, gridSystem) {
    let score = 0;

    // Favor positions that can attack opponent cards
    const neighbors = gridSystem.getHorizontalNeighbors(position);

    [neighbors.left, neighbors.right].forEach((neighborPos) => {
      if (neighborPos !== null) {
        const neighborCard = gridSystem.getCardAt(neighborPos);
        if (neighborCard && neighborCard.owner !== this.player) {
          if (card.canDefeat(neighborCard.type)) {
            score += 5; // High bonus for potential wins
          }
        }
      }
    });

    return score;
  }

  /**
   * Evaluate defensive strategy
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Defensive strategy score
   */
  evaluateDefensiveStrategy(card, position, gridSystem) {
    let score = 0;

    // Favor positions that protect existing cards
    const adjacentCards = gridSystem
      .getAdjacentPositions(position)
      .map((pos) => gridSystem.getCardAt(pos))
      .filter((card) => card && card.owner === this.player);

    score += adjacentCards.length * 2; // Bonus for protecting friendly cards

    // Avoid risky positions
    const neighbors = gridSystem.getHorizontalNeighbors(position);
    [neighbors.left, neighbors.right].forEach((neighborPos) => {
      if (neighborPos !== null) {
        const neighborCard = gridSystem.getCardAt(neighborPos);
        if (neighborCard && neighborCard.owner !== this.player) {
          if (neighborCard.canDefeat(card.type)) {
            score -= 3; // Penalty for vulnerable positions
          }
        }
      }
    });

    return score;
  }

  /**
   * Evaluate balanced strategy
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Balanced strategy score
   */
  evaluateBalancedStrategy(card, position, gridSystem) {
    const aggressiveScore = this.evaluateAggressiveStrategy(
      card,
      position,
      gridSystem
    );
    const defensiveScore = this.evaluateDefensiveStrategy(
      card,
      position,
      gridSystem
    );

    return (aggressiveScore + defensiveScore) * 0.6; // Balanced approach
  }

  /**
   * Evaluate disruption potential
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Disruption score
   */
  evaluateDisruption(card, position, gridSystem) {
    let score = 0;

    // Check if this play blocks opponent's good positions
    const opponentCards = gridSystem
      .getAllCards()
      .filter((entry) => entry.card.owner !== this.player);

    for (const entry of opponentCards) {
      const distance = gridSystem.getDistance(position, entry.position);
      if (distance <= 2) {
        score += 1; // Bonus for being near opponent cards
      }
    }

    return score;
  }

  /**
   * Evaluate risk of a play
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {number} Risk penalty
   */
  evaluateRisk(card, position, gridSystem) {
    let risk = 0;

    // Risk of immediate loss
    const neighbors = gridSystem.getHorizontalNeighbors(position);
    [neighbors.left, neighbors.right].forEach((neighborPos) => {
      if (neighborPos !== null) {
        const neighborCard = gridSystem.getCardAt(neighborPos);
        if (neighborCard && neighborCard.owner !== this.player) {
          if (neighborCard.canDefeat(card.type)) {
            risk += 2; // Risk of losing this card
          }
        }
      }
    });

    // Risk based on AI caution trait
    risk *= this.traits.caution;

    return risk;
  }

  /**
   * Predict outcome of a play
   * @param {Card} card - Card being played
   * @param {number} position - Position being considered
   * @param {GridSystem} gridSystem - Grid system
   * @returns {Object} Predicted outcome
   */
  predictOutcome(card, position, gridSystem) {
    const battles = [];
    const neighbors = gridSystem.getHorizontalNeighbors(position);

    [neighbors.left, neighbors.right].forEach((neighborPos, index) => {
      if (neighborPos !== null) {
        const neighborCard = gridSystem.getCardAt(neighborPos);
        if (neighborCard && neighborCard.owner !== this.player) {
          const battleResult = card.determineBattleResult(
            card.type,
            neighborCard.type
          );
          battles.push({
            position: neighborPos,
            opponent: neighborCard,
            result: battleResult,
            side: index === 0 ? "left" : "right",
          });
        }
      }
    });

    return {
      battles: battles,
      expectedWins: battles.filter((b) => b.result === BATTLE_RESULTS.WIN)
        .length,
      expectedLosses: battles.filter((b) => b.result === BATTLE_RESULTS.LOSE)
        .length,
    };
  }

  /**
   * Select best play from analyzed options
   * @param {Array<Object>} plays - Analyzed plays
   * @param {Object} gameState - Current game state
   * @returns {Object|null} Best play
   */
  selectBestPlay(plays, gameState) {
    if (plays.length === 0) return null;

    // Add some randomness to prevent predictability
    const topPlays = plays.slice(0, Math.min(3, plays.length));

    // Weight selection by score and add randomness
    const weights = topPlays.map((play, index) => {
      const baseWeight = play.score;
      const randomFactor = (Math.random() - 0.5) * this.traits.adaptability * 2;
      return Math.max(0, baseWeight + randomFactor);
    });

    // Select play based on weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return plays[0]; // Fallback to best play

    let random = Math.random() * totalWeight;
    for (let i = 0; i < topPlays.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return topPlays[i];
      }
    }

    return topPlays[0]; // Fallback
  }

  /**
   * Decide whether to bluff
   * @param {Object} play - Selected play
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if should bluff
   */
  shouldBluff(play, gameState) {
    // Base bluff rate from difficulty
    let bluffChance = this.difficulty.bluffRate;

    // Adjust based on game situation
    if (this.player.score < gameState.opponent?.score) {
      bluffChance += 0.1; // More likely to bluff when behind
    }

    if (this.player.hand.length <= 2) {
      bluffChance += 0.15; // More desperate bluffing with few cards
    }

    // Adjust based on opponent's challenge history
    const opponentChallengeRate = this.getOpponentChallengeRate();
    if (opponentChallengeRate > 0.6) {
      bluffChance -= 0.2; // Less likely to bluff against aggressive challenger
    }

    // Apply personality trait
    bluffChance *= this.traits.deception * 2;

    // Add some randomness
    bluffChance += (Math.random() - 0.5) * 0.1;

    return Math.random() < Math.max(0, Math.min(1, bluffChance));
  }

  /**
   * Choose best bluff type
   * @param {Card} actualCard - Actual card being played
   * @returns {string} Best bluff type
   */
  chooseBestBluff(actualCard) {
    const possibleBluffs = Object.values(CARD_TYPES).filter(
      (type) => type !== actualCard.type
    );

    // Simple strategy: choose type that would be most advantageous
    // In a more sophisticated version, this could consider opponent's likely cards
    return possibleBluffs[Math.floor(Math.random() * possibleBluffs.length)];
  }

  /**
   * Make challenge decision
   * @param {Object} challengeablePlay - Play that can be challenged
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if should challenge
   */
  makeChallengDecision(challengeablePlay, gameState) {
    if (!challengeablePlay || challengeablePlay.player === this.player) {
      return false;
    }

    // Base challenge rate from difficulty
    let challengeChance = this.difficulty.challengeRate;

    // Analyze opponent's behavior
    const opponentBluffRate = this.getOpponentBluffRate(
      challengeablePlay.player
    );
    challengeChance += opponentBluffRate * 0.5;

    // Consider the claimed vs likely actual type
    const suspicionLevel = this.analyzeSuspicion(challengeablePlay);
    challengeChance += suspicionLevel * 0.3;

    // Risk assessment - don't challenge if we can't afford to lose points
    if (this.player.score <= 1) {
      challengeChance *= 0.3; // Much less likely to challenge when low on points
    }

    // Apply personality traits
    challengeChance *= 1 + this.traits.aggression;
    challengeChance *= 2 - this.traits.caution;

    // Add randomness
    challengeChance += (Math.random() - 0.5) * 0.1;

    const shouldChallenge =
      Math.random() < Math.max(0, Math.min(1, challengeChance));

    if (DEBUG.ENABLED) {
      console.log("AI challenge decision:", {
        challengeChance: challengeChance.toFixed(2),
        opponentBluffRate: opponentBluffRate.toFixed(2),
        suspicionLevel: suspicionLevel.toFixed(2),
        decision: shouldChallenge,
      });
    }

    return shouldChallenge;
  }

  /**
   * Analyze suspicion level of a play
   * @param {Object} play - Play to analyze
   * @returns {number} Suspicion level (0-1)
   */
  analyzeSuspicion(play) {
    let suspicion = 0;

    // Check if the claimed type makes strategic sense
    const claimedType = play.claimedType;
    const position = play.position;

    // If we have memory of this opponent's patterns
    const playerMemory = this.getPlayerMemory(play.player);
    if (playerMemory.length > 0) {
      const recentBluffs = playerMemory.filter((m) => m.wasBluff).length;
      const totalPlays = playerMemory.length;
      suspicion += (recentBluffs / totalPlays) * 0.5;
    }

    // Tactical analysis - does this claim make sense strategically?
    if (this.doesClaimMakeSense(claimedType, position, play.player)) {
      suspicion -= 0.2; // Less suspicious if it makes tactical sense
    } else {
      suspicion += 0.3; // More suspicious if it doesn't make sense
    }

    return Math.max(0, Math.min(1, suspicion));
  }

  /**
   * Check if a claim makes tactical sense
   * @param {string} claimedType - Claimed card type
   * @param {number} position - Position of play
   * @param {Player} player - Player making the claim
   * @returns {boolean} True if claim makes sense
   */
  doesClaimMakeSense(claimedType, position, player) {
    // This is a simplified analysis - could be much more sophisticated
    // For now, just check if the claimed type would be advantageous

    // In a full implementation, this would analyze what the claimed type
    // would accomplish strategically at that position
    return true; // Placeholder
  }

  /**
   * Remember a decision for learning
   * @param {Object} decision - Decision made
   * @param {Object} gameState - Game state when decision was made
   */
  rememberDecision(decision, gameState) {
    const memory = {
      decision: decision,
      gameState: {
        score: this.player.score,
        opponentScore: gameState.opponent?.score || 0,
        handSize: this.player.hand.length,
        roundNumber: gameState.roundNumber || 1,
      },
      timestamp: Date.now(),
      outcome: null, // Will be filled in later when outcome is known
    };

    this.decisionHistory.push(memory);

    // Keep history manageable
    if (this.decisionHistory.length > 20) {
      this.decisionHistory.shift();
    }
  }

  /**
   * Update memory with outcome of previous decisions
   * @param {Object} outcomeData - Data about what happened
   */
  updateMemoryWithOutcome(outcomeData) {
    // Find recent decisions that match this outcome
    const recentDecisions = this.decisionHistory.filter(
      (d) => !d.outcome && Date.now() - d.timestamp < 30000
    ); // Within 30 seconds

    for (const decision of recentDecisions) {
      decision.outcome = outcomeData;
    }
  }

  /**
   * Get opponent's bluff rate from memory
   * @param {Player} opponent - Opponent to analyze
   * @returns {number} Estimated bluff rate
   */
  getOpponentBluffRate(opponent) {
    const opponentMemory = this.getPlayerMemory(opponent);
    if (opponentMemory.length === 0) return 0.3; // Default assumption

    const bluffs = opponentMemory.filter((m) => m.wasBluff).length;
    return bluffs / opponentMemory.length;
  }

  /**
   * Get opponent's challenge rate from memory
   * @returns {number} Estimated challenge rate
   */
  getOpponentChallengeRate() {
    // This would track how often the opponent challenges
    // For now, return a default
    return 0.4;
  }

  /**
   * Get memory about a specific player
   * @param {Player} player - Player to get memory about
   * @returns {Array} Memory entries about this player
   */
  getPlayerMemory(player) {
    return this.memory.filter((m) => m.player === player);
  }

  /**
   * Add memory about an opponent's play
   * @param {Player} player - Player who made the play
   * @param {Object} playData - Data about the play
   */
  addMemory(player, playData) {
    const memoryEntry = {
      player: player,
      playData: playData,
      timestamp: Date.now(),
      wasBluff: playData.wasBluff || false,
    };

    this.memory.push(memoryEntry);

    // Keep memory within limits
    if (this.memory.length > this.maxMemorySize) {
      this.memory.shift();
    }
  }

  /**
   * Adapt strategy based on game progress
   * @param {Object} gameState - Current game state
   */
  adaptStrategy(gameState) {
    if (!gameState.opponent) return;

    const scoreDifference = this.player.score - gameState.opponent.score;

    // Adapt based on score situation
    if (scoreDifference > 3) {
      this.strategy = "defensive"; // Play it safe when ahead
      this.traits.caution += 0.1;
    } else if (scoreDifference < -3) {
      this.strategy = "aggressive"; // Take risks when behind
      this.traits.aggression += 0.1;
      this.traits.deception += 0.1;
    } else {
      this.strategy = "balanced";
    }

    // Adapt based on game phase
    if (gameState.roundNumber > 3) {
      this.traits.caution += 0.05; // More cautious in later rounds
    }

    // Clamp traits to reasonable bounds
    this.traits.aggression = Math.max(
      0.1,
      Math.min(0.9, this.traits.aggression)
    );
    this.traits.deception = Math.max(0.1, Math.min(0.8, this.traits.deception));
    this.traits.caution = Math.max(0.1, Math.min(0.9, this.traits.caution));

    if (DEBUG.ENABLED) {
      console.log("AI adapted strategy:", {
        strategy: this.strategy,
        traits: this.traits,
        scoreDiff: scoreDifference,
      });
    }
  }

  /**
   * Get AI statistics for debugging
   * @returns {Object} AI statistics
   */
  getStatistics() {
    return {
      difficulty: this.difficulty.name,
      strategy: this.strategy,
      traits: { ...this.traits },
      memorySize: this.memory.length,
      decisionHistory: this.decisionHistory.length,
      bluffRate: this.difficulty.bluffRate,
      challengeRate: this.difficulty.challengeRate,
    };
  }

  /**
   * Reset AI state for new game
   */
  reset() {
    this.memory = [];
    this.decisionHistory = [];
    this.strategy = "balanced";

    // Reset traits to initial values
    this.traits = {
      aggression: 0.5,
      deception: this.difficulty.bluffRate,
      caution: 1 - this.difficulty.challengeRate,
      adaptability: this.difficulty.adaptationRate,
    };

    if (DEBUG.ENABLED) {
      console.log("AI player reset");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AIPlayer;
}

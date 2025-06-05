/**
 * Bluff Battle - Challenge System
 * Handles bluff detection, challenge mechanics, and penalties
 */

class ChallengeSystem {
  constructor() {
    this.pendingChallenges = [];
    this.challengeHistory = [];
    this.lastPlayedCard = null;
    this.challengeTimeWindow = 5000; // 5 seconds to challenge after a play
    this.challengeTimer = null;

    if (DEBUG.ENABLED) {
      console.log("ChallengeSystem initialized");
    }
  }

  /**
   * Register a card play that can potentially be challenged
   * @param {Card} card - Card that was played
   * @param {Player} player - Player who played the card
   * @param {string} claimedType - What the player claimed the card is
   * @param {number} position - Where the card was played
   */
  registerPlay(card, player, claimedType, position) {
    if (!(card instanceof Card) || !(player instanceof Player)) {
      throw new Error("Invalid card or player for challenge registration");
    }

    // Clear any existing challenge timer
    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
    }

    this.lastPlayedCard = {
      card: card,
      player: player,
      claimedType: claimedType,
      actualType: card.type,
      position: position,
      timestamp: Date.now(),
      challengeable: true,
    };

    // Set timer for challenge window
    this.challengeTimer = setTimeout(() => {
      this.closeChallengeWindow();
    }, this.challengeTimeWindow);

    if (DEBUG.ENABLED) {
      console.log(
        `Play registered for challenge: ${player.name} claims ${claimedType} (actually ${card.type})`
      );
    }

    // Safely emit event if EVENTS is available
    if (typeof EVENTS !== "undefined" && EVENTS.CHALLENGE_WINDOW_OPEN) {
      eventBus.emit(EVENTS.CHALLENGE_WINDOW_OPEN, {
        play: this.lastPlayedCard,
        timeWindow: this.challengeTimeWindow,
      });
    }
  }

  /**
   * Attempt to challenge the last played card
   * @param {Player} challenger - Player making the challenge
   * @returns {Object} Challenge result
   */
  makeChallenge(challenger) {
    if (!(challenger instanceof Player)) {
      throw new Error("Invalid challenger");
    }

    if (!this.lastPlayedCard || !this.lastPlayedCard.challengeable) {
      return {
        success: false,
        error: "No challengeable play available",
        result: null,
      };
    }

    if (challenger === this.lastPlayedCard.player) {
      return {
        success: false,
        error: "Cannot challenge your own play",
        result: null,
      };
    }

    // Clear challenge timer
    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }

    // Process the challenge
    const challengeResult = this.processChallenge(
      challenger,
      this.lastPlayedCard
    );

    // Add to history
    this.challengeHistory.push({
      challenger: challenger,
      defendingPlayer: this.lastPlayedCard.player,
      card: this.lastPlayedCard.card,
      claimedType: this.lastPlayedCard.claimedType,
      actualType: this.lastPlayedCard.actualType,
      result: challengeResult.result,
      timestamp: Date.now(),
      pointsChanged: challengeResult.pointsChanged,
    });

    // Close challenge window
    this.lastPlayedCard.challengeable = false;

    if (DEBUG.ENABLED) {
      console.log(
        `Challenge made by ${challenger.name}: ${challengeResult.result}`
      );
    }

    eventBus.emit(EVENTS.CHALLENGE_MADE, {
      challenger: challenger,
      defendingPlayer: this.lastPlayedCard.player,
      challengeResult: challengeResult,
    });

    return {
      success: true,
      error: null,
      result: challengeResult,
    };
  }

  /**
   * Process a challenge and determine the outcome
   * @param {Player} challenger - Player making the challenge
   * @param {Object} playData - Data about the play being challenged
   * @returns {Object} Challenge processing result
   */
  processChallenge(challenger, playData) {
    const { card, player, claimedType, actualType } = playData;

    // Determine if the claim was a bluff
    const wasBluff = claimedType !== actualType;

    let result;
    let pointsChanged = 0;
    let explanation = "";

    if (wasBluff) {
      // Successful challenge - the play was indeed a bluff
      result = CHALLENGE_RESULTS.SUCCESSFUL;
      explanation = `${player.name} was bluffing! Claimed ${CARD_INFO[claimedType].name} but played ${CARD_INFO[actualType].name}`;

      // Challenger gains points or defending player loses points
      // (Implementation can vary - here we don't penalize the bluffer directly)
      // pointsChanged = 0; // No immediate point change, just prevents bluff success

      // Update player statistics
      challenger.stats.challengesSuccessful++;
      player.stats.bluffsAttempted--; // Remove the successful bluff from stats
    } else {
      // Failed challenge - the play was truthful
      result = CHALLENGE_RESULTS.FAILED;
      explanation = `${player.name} was telling the truth! Both claimed and actual type are ${CARD_INFO[actualType].name}`;

      // Challenger loses points for wrong challenge
      challenger.addScore(-SCORING.CHALLENGE_PENALTY);
      pointsChanged = -SCORING.CHALLENGE_PENALTY;

      // Update defending player's successful truth-telling
      player.stats.truthfulPlays = (player.stats.truthfulPlays || 0) + 1;
    }

    // Reveal the card since it was challenged
    card.reveal();

    // Update player behavior profiles
    challenger.updateBehaviorProfile("challengeMade", {
      opponent: player.id,
      wasCorrect: result === CHALLENGE_RESULTS.SUCCESSFUL,
      challengedCard: actualType,
      claimedType: claimedType,
    });

    player.updateBehaviorProfile("challengeReceived", {
      challenger: challenger.id,
      wasBluff: wasBluff,
      cardType: actualType,
      claimedType: claimedType,
      challengeResult: result,
    });

    return {
      result: result,
      wasBluff: wasBluff,
      explanation: explanation,
      pointsChanged: pointsChanged,
      cardRevealed: true,
      challenger: challenger,
      defendingPlayer: player,
      card: card,
    };
  }

  /**
   * Close the challenge window (called by timer or manual close)
   */
  closeChallengeWindow() {
    if (this.lastPlayedCard) {
      this.lastPlayedCard.challengeable = false;
    }

    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }

    if (DEBUG.ENABLED) {
      console.log("Challenge window closed");
    }

    // Safely emit event if EVENTS is available
    if (typeof EVENTS !== "undefined" && EVENTS.CHALLENGE_WINDOW_CLOSED) {
      eventBus.emit(EVENTS.CHALLENGE_WINDOW_CLOSED, {
        lastPlay: this.lastPlayedCard,
      });
    }
  }

  /**
   * Check if there's currently a challengeable play
   * @returns {boolean} True if a challenge can be made
   */
  canChallenge() {
    return (
      this.lastPlayedCard &&
      this.lastPlayedCard.challengeable &&
      Date.now() - this.lastPlayedCard.timestamp < this.challengeTimeWindow
    );
  }

  /**
   * Get information about the current challengeable play
   * @returns {Object|null} Challenge information or null if no challenge available
   */
  getChallengeablePlay() {
    if (!this.canChallenge()) {
      return null;
    }

    return {
      player: this.lastPlayedCard.player.name,
      claimedType: this.lastPlayedCard.claimedType,
      position: this.lastPlayedCard.position,
      timeRemaining: Math.max(
        0,
        this.challengeTimeWindow - (Date.now() - this.lastPlayedCard.timestamp)
      ),
    };
  }

  /**
   * Get challenge statistics for a player
   * @param {Player} player - Player to get stats for
   * @returns {Object} Challenge statistics
   */
  getPlayerChallengeStats(player) {
    const challenges = this.challengeHistory.filter(
      (c) => c.challenger === player
    );
    const defenses = this.challengeHistory.filter(
      (c) => c.defendingPlayer === player
    );

    const challengeStats = {
      challengesMade: challenges.length,
      challengesSuccessful: challenges.filter(
        (c) => c.result === CHALLENGE_RESULTS.SUCCESSFUL
      ).length,
      challengesFailed: challenges.filter(
        (c) => c.result === CHALLENGE_RESULTS.FAILED
      ).length,
      challengeSuccessRate: 0,

      timesChallenged: defenses.length,
      bluffsCaught: defenses.filter(
        (c) => c.result === CHALLENGE_RESULTS.SUCCESSFUL
      ).length,
      truthfulDefenses: defenses.filter(
        (c) => c.result === CHALLENGE_RESULTS.FAILED
      ).length,
      bluffSuccessRate: 0,

      totalPointsFromChallenges: 0,
    };

    if (challengeStats.challengesMade > 0) {
      challengeStats.challengeSuccessRate =
        challengeStats.challengesSuccessful / challengeStats.challengesMade;
    }

    if (challengeStats.timesChallenged > 0) {
      challengeStats.bluffSuccessRate =
        1 - challengeStats.bluffsCaught / challengeStats.timesChallenged;
    }

    // Calculate point changes from challenges
    for (const challenge of challenges) {
      challengeStats.totalPointsFromChallenges += challenge.pointsChanged || 0;
    }

    return challengeStats;
  }

  /**
   * Analyze bluffing patterns for AI adaptation
   * @param {Player} player - Player to analyze
   * @returns {Object} Bluffing pattern analysis
   */
  analyzeBluffingPatterns(player) {
    const playerHistory = this.challengeHistory.filter(
      (c) => c.defendingPlayer === player || c.challenger === player
    );

    const analysis = {
      bluffingFrequency: 0,
      favoriteBluffTypes: {},
      bluffingPositions: {},
      challengingTendency: 0,
      adaptationPattern: "stable",
    };

    // Analyze plays where this player was defending
    const defenses = playerHistory.filter((c) => c.defendingPlayer === player);
    const bluffs = defenses.filter(
      (c) => c.result === CHALLENGE_RESULTS.SUCCESSFUL
    );

    if (defenses.length > 0) {
      analysis.bluffingFrequency = bluffs.length / defenses.length;
    }

    // Analyze bluff types
    for (const bluff of bluffs) {
      const claimedType = bluff.claimedType;
      analysis.favoriteBluffTypes[claimedType] =
        (analysis.favoriteBluffTypes[claimedType] || 0) + 1;
    }

    // Analyze challenging behavior
    const challenges = playerHistory.filter((c) => c.challenger === player);
    if (playerHistory.length > 0) {
      analysis.challengingTendency = challenges.length / playerHistory.length;
    }

    // Determine adaptation pattern based on recent history
    if (playerHistory.length >= 6) {
      const recent = playerHistory.slice(-6);
      const older = playerHistory.slice(0, -6);

      const recentBluffRate =
        recent.filter(
          (c) =>
            c.defendingPlayer === player &&
            c.result === CHALLENGE_RESULTS.SUCCESSFUL
        ).length /
        Math.max(1, recent.filter((c) => c.defendingPlayer === player).length);

      const olderBluffRate =
        older.filter(
          (c) =>
            c.defendingPlayer === player &&
            c.result === CHALLENGE_RESULTS.SUCCESSFUL
        ).length /
        Math.max(1, older.filter((c) => c.defendingPlayer === player).length);

      if (Math.abs(recentBluffRate - olderBluffRate) > 0.3) {
        analysis.adaptationPattern =
          recentBluffRate > olderBluffRate
            ? "increasing_bluffs"
            : "decreasing_bluffs";
      }
    }

    return analysis;
  }

  /**
   * Get recommendations for when to challenge
   * @param {Player} potentialChallenger - Player considering a challenge
   * @param {Object} playInfo - Information about the play to potentially challenge
   * @returns {Object} Challenge recommendation
   */
  getChallengeRecommendation(potentialChallenger, playInfo = null) {
    if (!playInfo) {
      playInfo = this.getChallengeablePlay();
    }

    if (!playInfo) {
      return {
        recommend: false,
        confidence: 0,
        reasoning: "No challengeable play available",
      };
    }

    const defendingPlayer = this.lastPlayedCard.player;
    const bluffingProfile = this.analyzeBluffingPatterns(defendingPlayer);

    let confidence = 0;
    const reasons = [];

    // Factor in opponent's bluffing frequency
    if (bluffingProfile.bluffingFrequency > 0.5) {
      confidence += 0.4;
      reasons.push("opponent bluffs frequently");
    } else if (bluffingProfile.bluffingFrequency < 0.2) {
      confidence -= 0.3;
      reasons.push("opponent rarely bluffs");
    }

    // Factor in challenger's success rate
    const challengerStats = this.getPlayerChallengeStats(potentialChallenger);
    if (challengerStats.challengeSuccessRate > 0.6) {
      confidence += 0.2;
      reasons.push("good challenge success rate");
    } else if (
      challengerStats.challengeSuccessRate < 0.4 &&
      challengerStats.challengesMade > 2
    ) {
      confidence -= 0.2;
      reasons.push("poor challenge success rate");
    }

    // Factor in claimed card type popularity for bluffs
    const claimedType = playInfo.claimedType || this.lastPlayedCard.claimedType;
    if (bluffingProfile.favoriteBluffTypes[claimedType] > 0) {
      confidence += 0.2;
      reasons.push(`opponent often bluffs with ${CARD_INFO[claimedType].name}`);
    }

    // Adjust for risk vs reward
    const challengerScore = potentialChallenger.score;
    if (challengerScore <= 2) {
      confidence -= 0.3; // Don't risk points when low
      reasons.push("risky when score is low");
    }

    // Normalize confidence
    confidence = Math.max(0, Math.min(1, confidence + 0.5)); // Base 50% + adjustments

    return {
      recommend: confidence > 0.6,
      confidence: confidence,
      reasoning: reasons.join(", "),
      riskAssessment:
        confidence < 0.4 ? "high" : confidence < 0.7 ? "medium" : "low",
    };
  }

  /**
   * Get challenge history for analysis
   * @param {number} limit - Maximum number of challenges to return
   * @returns {Array} Recent challenge history
   */
  getChallengeHistory(limit = 10) {
    return this.challengeHistory.slice(-limit);
  }

  /**
   * Clear challenge system state
   */
  clear() {
    this.pendingChallenges = [];
    this.challengeHistory = [];
    this.lastPlayedCard = null;

    if (this.challengeTimer) {
      clearTimeout(this.challengeTimer);
      this.challengeTimer = null;
    }

    if (DEBUG.ENABLED) {
      console.log("ChallengeSystem cleared");
    }
  }

  /**
   * Set challenge time window
   * @param {number} milliseconds - New time window in ms
   */
  setChallengeTimeWindow(milliseconds) {
    this.challengeTimeWindow = Math.max(1000, Math.min(30000, milliseconds)); // 1-30 seconds

    if (DEBUG.ENABLED) {
      console.log(`Challenge time window set to ${this.challengeTimeWindow}ms`);
    }
  }

  /**
   * Force close any pending challenges
   */
  forceCloseChallenges() {
    this.closeChallengeWindow();

    if (DEBUG.ENABLED) {
      console.log("All challenges force closed");
    }
  }

  /**
   * Get overall challenge system statistics
   * @returns {Object} System-wide challenge statistics
   */
  getSystemStats() {
    const totalChallenges = this.challengeHistory.length;
    const successfulChallenges = this.challengeHistory.filter(
      (c) => c.result === CHALLENGE_RESULTS.SUCCESSFUL
    ).length;

    return {
      totalChallenges: totalChallenges,
      successfulChallenges: successfulChallenges,
      failedChallenges: totalChallenges - successfulChallenges,
      overallSuccessRate:
        totalChallenges > 0 ? successfulChallenges / totalChallenges : 0,
      averageChallengesPerGame: totalChallenges, // Would need game counter for accuracy
      challengeTimeWindow: this.challengeTimeWindow,
      currentChallengeable: this.canChallenge(),
    };
  }

  /**
   * Validate challenge system state
   * @returns {boolean} True if state is valid
   */
  validate() {
    // Check challenge history integrity
    for (const challenge of this.challengeHistory) {
      if (
        !challenge.challenger ||
        !challenge.defendingPlayer ||
        !challenge.card ||
        !challenge.result
      ) {
        console.error("ChallengeSystem: Invalid challenge in history");
        return false;
      }
    }

    // Check last played card validity
    if (this.lastPlayedCard) {
      if (!this.lastPlayedCard.card || !this.lastPlayedCard.player) {
        console.error("ChallengeSystem: Invalid last played card");
        return false;
      }
    }

    return true;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChallengeSystem;
}

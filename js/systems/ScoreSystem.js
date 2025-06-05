/**
 * Bluff Battle - Score System
 * Manages scoring, achievements, and score-related events
 */

class ScoreSystem {
  constructor() {
    this.scoreHistory = [];
    this.achievements = new Map();
    this.scoringRules = { ...SCORING };
    this.multipliers = new Map();
    this.listeners = new Map();

    if (DEBUG.ENABLED) {
      console.log("ScoreSystem initialized");
    }
  }

  /**
   * Award points to a player
   * @param {Player} player - Player to award points to
   * @param {number} points - Points to award
   * @param {string} reason - Reason for points
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Score change result
   */
  awardPoints(player, points, reason, metadata = {}) {
    if (!(player instanceof Player)) {
      throw new Error("Invalid player instance");
    }

    if (typeof points !== "number" || points < 0) {
      throw new Error("Points must be a positive number");
    }

    const oldScore = player.score;

    // Apply any active multipliers
    const finalPoints = this.applyMultipliers(player, points, reason);

    // Award the points
    player.addScore(finalPoints);

    const scoreChange = {
      player: player,
      pointsAwarded: finalPoints,
      originalPoints: points,
      reason: reason,
      metadata: metadata,
      oldScore: oldScore,
      newScore: player.score,
      timestamp: Date.now(),
    };

    // Record in history
    this.scoreHistory.push(scoreChange);

    // Keep history manageable
    if (this.scoreHistory.length > 100) {
      this.scoreHistory.shift();
    }

    // Check for achievements
    this.checkAchievements(player, scoreChange);

    // Notify listeners
    this.notifyScoreChange(scoreChange);

    // Emit event
    eventBus.emit(EVENTS.POINTS_AWARDED, scoreChange);

    if (DEBUG.ENABLED) {
      console.log(`Points awarded: ${player.name} +${finalPoints} (${reason})`);
    }

    return scoreChange;
  }

  /**
   * Deduct points from a player
   * @param {Player} player - Player to deduct points from
   * @param {number} points - Points to deduct
   * @param {string} reason - Reason for deduction
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Score change result
   */
  deductPoints(player, points, reason, metadata = {}) {
    if (!(player instanceof Player)) {
      throw new Error("Invalid player instance");
    }

    if (typeof points !== "number" || points < 0) {
      throw new Error("Points must be a positive number");
    }

    const oldScore = player.score;
    const actualDeduction = Math.min(points, player.score); // Can't go below 0

    player.addScore(-actualDeduction);

    const scoreChange = {
      player: player,
      pointsDeducted: actualDeduction,
      requestedDeduction: points,
      reason: reason,
      metadata: metadata,
      oldScore: oldScore,
      newScore: player.score,
      timestamp: Date.now(),
    };

    // Record in history
    this.scoreHistory.push(scoreChange);

    // Notify listeners
    this.notifyScoreChange(scoreChange);

    // Emit event
    eventBus.emit(EVENTS.SCORE_UPDATE, scoreChange);

    if (DEBUG.ENABLED) {
      console.log(
        `Points deducted: ${player.name} -${actualDeduction} (${reason})`
      );
    }

    return scoreChange;
  }

  /**
   * Apply multipliers to points
   * @param {Player} player - Player receiving points
   * @param {number} points - Base points
   * @param {string} reason - Scoring reason
   * @returns {number} Modified points
   */
  applyMultipliers(player, points, reason) {
    let finalPoints = points;

    // Apply player-specific multipliers
    const playerMultipliers = this.multipliers.get(player.id) || [];
    for (const multiplier of playerMultipliers) {
      if (
        this.isMultiplierActive(multiplier) &&
        this.multiplierApplies(multiplier, reason)
      ) {
        finalPoints *= multiplier.value;

        if (DEBUG.ENABLED) {
          console.log(
            `Applied multiplier ${multiplier.name}: ${points} -> ${finalPoints}`
          );
        }
      }
    }

    return Math.round(finalPoints);
  }

  /**
   * Check if a multiplier is currently active
   * @param {Object} multiplier - Multiplier to check
   * @returns {boolean} True if active
   */
  isMultiplierActive(multiplier) {
    const now = Date.now();
    return now >= multiplier.startTime && now <= multiplier.endTime;
  }

  /**
   * Check if a multiplier applies to a scoring reason
   * @param {Object} multiplier - Multiplier to check
   * @param {string} reason - Scoring reason
   * @returns {boolean} True if applies
   */
  multiplierApplies(multiplier, reason) {
    if (!multiplier.conditions) return true;

    if (multiplier.conditions.reasons) {
      return multiplier.conditions.reasons.includes(reason);
    }

    return true;
  }

  /**
   * Add a score multiplier for a player
   * @param {Player} player - Player to add multiplier for
   * @param {Object} multiplierConfig - Multiplier configuration
   * @returns {string} Multiplier ID
   */
  addMultiplier(player, multiplierConfig) {
    const multiplier = {
      id: `mult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: multiplierConfig.name || "Bonus",
      value: multiplierConfig.value || 1.0,
      startTime: multiplierConfig.startTime || Date.now(),
      endTime: multiplierConfig.endTime || Date.now() + 60000, // 1 minute default
      conditions: multiplierConfig.conditions || null,
      ...multiplierConfig,
    };

    if (!this.multipliers.has(player.id)) {
      this.multipliers.set(player.id, []);
    }

    this.multipliers.get(player.id).push(multiplier);

    if (DEBUG.ENABLED) {
      console.log(
        `Added multiplier for ${player.name}: ${multiplier.name} (${multiplier.value}x)`
      );
    }

    return multiplier.id;
  }

  /**
   * Remove a multiplier
   * @param {Player} player - Player to remove multiplier from
   * @param {string} multiplierId - ID of multiplier to remove
   * @returns {boolean} True if removed
   */
  removeMultiplier(player, multiplierId) {
    const playerMultipliers = this.multipliers.get(player.id);
    if (!playerMultipliers) return false;

    const index = playerMultipliers.findIndex((m) => m.id === multiplierId);
    if (index === -1) return false;

    playerMultipliers.splice(index, 1);

    if (DEBUG.ENABLED) {
      console.log(`Removed multiplier ${multiplierId} for ${player.name}`);
    }

    return true;
  }

  /**
   * Clean up expired multipliers
   */
  cleanupMultipliers() {
    const now = Date.now();
    let removedCount = 0;

    for (const [playerId, multipliers] of this.multipliers.entries()) {
      const activeMults = multipliers.filter((m) => m.endTime > now);
      removedCount += multipliers.length - activeMults.length;

      if (activeMults.length === 0) {
        this.multipliers.delete(playerId);
      } else {
        this.multipliers.set(playerId, activeMults);
      }
    }

    if (DEBUG.ENABLED && removedCount > 0) {
      console.log(`Cleaned up ${removedCount} expired multipliers`);
    }
  }

  /**
   * Check for achievements after score change
   * @param {Player} player - Player to check achievements for
   * @param {Object} scoreChange - Score change data
   */
  checkAchievements(player, scoreChange) {
    // First Score achievement
    if (scoreChange.oldScore === 0 && scoreChange.newScore > 0) {
      this.unlockAchievement(
        player,
        "first_score",
        "First Blood",
        "Scored your first point!"
      );
    }

    // High Score achievements
    if (scoreChange.newScore >= 5 && !this.hasAchievement(player, "score_5")) {
      this.unlockAchievement(
        player,
        "score_5",
        "Getting Started",
        "Reached 5 points!"
      );
    }

    if (
      scoreChange.newScore >= 10 &&
      !this.hasAchievement(player, "score_10")
    ) {
      this.unlockAchievement(
        player,
        "score_10",
        "Double Digits",
        "Reached 10 points!"
      );
    }

    if (
      scoreChange.newScore >= 20 &&
      !this.hasAchievement(player, "score_20")
    ) {
      this.unlockAchievement(
        player,
        "score_20",
        "Score Master",
        "Reached 20 points!"
      );
    }

    // Combo achievements
    if (scoreChange.reason === "battle_win") {
      this.checkComboAchievements(player);
    }

    // Big Score achievements
    if (scoreChange.pointsAwarded >= 5) {
      this.unlockAchievement(
        player,
        "big_score",
        "Big Score",
        "Scored 5+ points in one action!"
      );
    }
  }

  /**
   * Check for combo-based achievements
   * @param {Player} player - Player to check
   */
  checkComboAchievements(player) {
    const recentWins = this.scoreHistory
      .filter((s) => s.player === player && s.reason === "battle_win")
      .slice(-3);

    if (recentWins.length >= 3) {
      const timeSpan =
        recentWins[recentWins.length - 1].timestamp - recentWins[0].timestamp;
      if (timeSpan <= 10000) {
        // 10 seconds
        this.unlockAchievement(
          player,
          "win_streak",
          "Win Streak",
          "Won 3 battles in 10 seconds!"
        );
      }
    }
  }

  /**
   * Unlock an achievement for a player
   * @param {Player} player - Player to unlock achievement for
   * @param {string} achievementId - Achievement ID
   * @param {string} name - Achievement name
   * @param {string} description - Achievement description
   */
  unlockAchievement(player, achievementId, name, description) {
    const playerAchievements = this.achievements.get(player.id) || new Set();

    if (playerAchievements.has(achievementId)) {
      return; // Already unlocked
    }

    playerAchievements.add(achievementId);
    this.achievements.set(player.id, playerAchievements);

    const achievement = {
      id: achievementId,
      name: name,
      description: description,
      player: player,
      unlockedAt: Date.now(),
    };

    if (DEBUG.ENABLED) {
      console.log(`Achievement unlocked: ${player.name} - ${name}`);
    }

    // Emit achievement event
    eventBus.emit("achievement_unlocked", achievement);

    // Show achievement notification (UI will handle this)
    this.showAchievementNotification(achievement);
  }

  /**
   * Check if player has specific achievement
   * @param {Player} player - Player to check
   * @param {string} achievementId - Achievement ID
   * @returns {boolean} True if player has achievement
   */
  hasAchievement(player, achievementId) {
    const playerAchievements = this.achievements.get(player.id);
    return playerAchievements ? playerAchievements.has(achievementId) : false;
  }

  /**
   * Get all achievements for a player
   * @param {Player} player - Player to get achievements for
   * @returns {Array} Array of achievement IDs
   */
  getPlayerAchievements(player) {
    const playerAchievements = this.achievements.get(player.id);
    return playerAchievements ? Array.from(playerAchievements) : [];
  }

  /**
   * Show achievement notification
   * @param {Object} achievement - Achievement data
   */
  showAchievementNotification(achievement) {
    // This would be handled by the UI system
    eventBus.emit("show_notification", {
      type: "achievement",
      title: `Achievement Unlocked!`,
      message: `${achievement.name}: ${achievement.description}`,
      duration: 5000,
    });
  }

  /**
   * Add a score change listener
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  addScoreListener(callback) {
    const listenerId = Date.now() + Math.random();
    this.listeners.set(listenerId, callback);

    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Notify listeners of score change
   * @param {Object} scoreChange - Score change data
   */
  notifyScoreChange(scoreChange) {
    for (const [id, callback] of this.listeners.entries()) {
      try {
        callback(scoreChange);
      } catch (error) {
        console.error(`Error in score listener ${id}:`, error);
      }
    }
  }

  /**
   * Get score statistics for a player
   * @param {Player} player - Player to get stats for
   * @returns {Object} Score statistics
   */
  getPlayerScoreStats(player) {
    const playerScores = this.scoreHistory.filter((s) => s.player === player);

    const stats = {
      totalPointsEarned: 0,
      totalPointsLost: 0,
      averagePerAction: 0,
      bestSingleScore: 0,
      scoringReasons: {},
      scoreOverTime: [],
    };

    let runningScore = 0;

    for (const score of playerScores) {
      if (score.pointsAwarded) {
        stats.totalPointsEarned += score.pointsAwarded;
        stats.bestSingleScore = Math.max(
          stats.bestSingleScore,
          score.pointsAwarded
        );
        runningScore += score.pointsAwarded;
      }

      if (score.pointsDeducted) {
        stats.totalPointsLost += score.pointsDeducted;
        runningScore -= score.pointsDeducted;
      }

      // Track reasons
      const reason = score.reason || "unknown";
      stats.scoringReasons[reason] = (stats.scoringReasons[reason] || 0) + 1;

      // Track score over time
      stats.scoreOverTime.push({
        timestamp: score.timestamp,
        score: runningScore,
        change: score.pointsAwarded || -score.pointsDeducted || 0,
      });
    }

    if (playerScores.length > 0) {
      stats.averagePerAction = stats.totalPointsEarned / playerScores.length;
    }

    return stats;
  }

  /**
   * Get leaderboard data
   * @param {Array<Player>} players - Players to include
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted leaderboard
   */
  getLeaderboard(players, sortBy = "score") {
    const leaderboard = players.map((player) => ({
      player: player,
      score: player.score,
      stats: this.getPlayerScoreStats(player),
    }));

    // Sort based on criteria
    switch (sortBy) {
      case "score":
        leaderboard.sort((a, b) => b.score - a.score);
        break;
      case "totalEarned":
        leaderboard.sort(
          (a, b) => b.stats.totalPointsEarned - a.stats.totalPointsEarned
        );
        break;
      case "bestSingle":
        leaderboard.sort(
          (a, b) => b.stats.bestSingleScore - a.stats.bestSingleScore
        );
        break;
      case "average":
        leaderboard.sort(
          (a, b) => b.stats.averagePerAction - a.stats.averagePerAction
        );
        break;
    }

    return leaderboard;
  }

  /**
   * Reset all scoring data
   */
  reset() {
    this.scoreHistory = [];
    this.achievements.clear();
    this.multipliers.clear();
    this.listeners.clear();

    if (DEBUG.ENABLED) {
      console.log("ScoreSystem reset");
    }
  }

  /**
   * Get score history
   * @param {Player} player - Specific player (optional)
   * @param {number} limit - Maximum entries to return
   * @returns {Array} Score history
   */
  getScoreHistory(player = null, limit = 50) {
    let history = this.scoreHistory;

    if (player) {
      history = history.filter((s) => s.player === player);
    }

    return history.slice(-limit);
  }

  /**
   * Calculate score prediction based on current trends
   * @param {Player} player - Player to predict for
   * @param {number} actionsAhead - Number of actions to predict
   * @returns {Object} Score prediction
   */
  predictScore(player, actionsAhead = 5) {
    const recentScores = this.getScoreHistory(player, 10);

    if (recentScores.length < 3) {
      return {
        predictedScore: player.score,
        confidence: 0,
        trend: "unknown",
      };
    }

    const scores = recentScores.map((s) => s.pointsAwarded || 0);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const trend =
      scores[scores.length - 1] > scores[0] ? "increasing" : "decreasing";

    const predictedScore = player.score + average * actionsAhead;
    const confidence = Math.min(1, recentScores.length / 10);

    return {
      predictedScore: Math.round(predictedScore),
      confidence: confidence,
      trend: trend,
      averagePerAction: average,
    };
  }

  /**
   * Export scoring data for analysis
   * @returns {Object} Exportable scoring data
   */
  exportData() {
    return {
      scoreHistory: this.scoreHistory,
      achievements: Object.fromEntries(this.achievements),
      scoringRules: this.scoringRules,
      exportedAt: Date.now(),
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ScoreSystem;
}

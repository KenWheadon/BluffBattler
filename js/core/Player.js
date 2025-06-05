/**
 * Bluff Battle - Player Class
 * Manages player state, hand, score, and actions
 */

class Player {
  constructor(id, name, type = PLAYER_TYPES.HUMAN) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.score = 0;
    this.hand = [];
    this.placedCards = [];
    this.selectedCard = null;
    this.isActive = false;

    // Game statistics
    this.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      roundsWon: 0,
      cardsPlayed: 0,
      bluffsAttempted: 0,
      bluffsSuccessful: 0,
      challengesMade: 0,
      challengesSuccessful: 0,
      battlesWon: 0,
      battlesLost: 0,
      totalPoints: 0,
    };

    // Behavioral tracking for AI adaptation
    this.behaviorProfile = {
      bluffingFrequency: 0,
      challengingFrequency: 0,
      cardTypePreferences: {},
      positionPreferences: {},
      recentActions: [],
    };

    this.createdAt = Date.now();

    if (DEBUG.ENABLED) {
      console.log(`Player created: ${this.name} (${this.type})`);
    }
  }

  /**
   * Deal cards to this player's hand
   * @param {Array<Card>} cards - Cards to add to hand
   */
  dealCards(cards) {
    if (!Array.isArray(cards)) {
      throw new Error("Cards must be an array");
    }

    // Set ownership of cards
    for (const card of cards) {
      if (!(card instanceof Card)) {
        throw new Error("Invalid card in dealt cards");
      }
      card.setOwner(this);
      card.state = CARD_STATES.IN_HAND;
    }

    this.hand = [...cards];
    this.selectedCard = null;

    if (DEBUG.ENABLED) {
      console.log(`${this.name} dealt ${cards.length} cards`);
    }

    eventBus.emit(EVENTS.CARD_SELECTED, {
      player: this,
      handSize: this.hand.length,
    });
  }

  /**
   * Select a card from hand
   * @param {string|number} cardIdentifier - Card ID or index in hand
   * @returns {Card|null} Selected card or null if invalid
   */
  selectCard(cardIdentifier) {
    let card = null;

    if (typeof cardIdentifier === "string") {
      // Select by card ID
      card = this.hand.find((c) => c.id === cardIdentifier);
    } else if (typeof cardIdentifier === "number") {
      // Select by index
      if (cardIdentifier >= 0 && cardIdentifier < this.hand.length) {
        card = this.hand[cardIdentifier];
      }
    }

    if (!card) {
      return null;
    }

    // Deselect previous card
    if (this.selectedCard) {
      this.selectedCard.state = CARD_STATES.IN_HAND;
    }

    // Select new card
    this.selectedCard = card;
    card.state = CARD_STATES.SELECTED;

    if (DEBUG.ENABLED) {
      console.log(`${this.name} selected card: ${card.toString()}`);
    }

    eventBus.emit(EVENTS.CARD_SELECTED, {
      player: this,
      card: card,
    });

    return card;
  }

  /**
   * Deselect currently selected card
   */
  deselectCard() {
    if (this.selectedCard) {
      this.selectedCard.state = CARD_STATES.IN_HAND;
      this.selectedCard = null;

      eventBus.emit(EVENTS.CARD_SELECTED, {
        player: this,
        card: null,
      });
    }
  }

  /**
   * Play a card to a grid position with a claim
   * @param {Card} card - Card to play
   * @param {number} position - Grid position (0-14)
   * @param {string} claimedType - What the player claims the card is
   * @returns {boolean} True if play was successful
   */
  playCard(card, position, claimedType) {
    if (!(card instanceof Card)) {
      throw new Error("Invalid card");
    }

    if (!this.hand.includes(card)) {
      throw new Error("Card not in player hand");
    }

    if (position < 0 || position >= GAME_CONFIG.TOTAL_POSITIONS) {
      throw new Error("Invalid grid position");
    }

    if (!Object.values(CARD_TYPES).includes(claimedType)) {
      throw new Error("Invalid claimed type");
    }

    // Remove card from hand
    const cardIndex = this.hand.indexOf(card);
    this.hand.splice(cardIndex, 1);

    // Set up the card
    card.setClaim(claimedType);
    card.place(position);

    // Add to placed cards
    this.placedCards.push(card);

    // Clear selection
    this.selectedCard = null;

    // Update statistics
    this.stats.cardsPlayed++;
    if (card.isBluffing()) {
      this.stats.bluffsAttempted++;
    }

    // Update behavior profile
    this.updateBehaviorProfile("cardPlayed", {
      actualType: card.type,
      claimedType: claimedType,
      position: position,
      wasBluff: card.isBluffing(),
    });

    if (DEBUG.ENABLED) {
      console.log(
        `${this.name} played ${card.toString()} at position ${position}`
      );
    }

    eventBus.emit(EVENTS.PLAY_CONFIRMED, {
      player: this,
      card: card,
      position: position,
      claim: claimedType,
    });

    return true;
  }

  /**
   * Challenge an opponent's claim
   * @param {Player} opponent - The opponent who made the claim
   * @param {Card} challengedCard - The card being challenged
   * @returns {string} Challenge result
   */
  challengeClaim(opponent, challengedCard) {
    if (!(opponent instanceof Player)) {
      throw new Error("Invalid opponent");
    }

    if (!(challengedCard instanceof Card)) {
      throw new Error("Invalid challenged card");
    }

    this.stats.challengesMade++;

    const isBluff = challengedCard.isBluffing();
    let result;

    if (isBluff) {
      // Successful challenge
      result = CHALLENGE_RESULTS.SUCCESSFUL;
      this.stats.challengesSuccessful++;
      opponent.stats.bluffsAttempted--; // They were caught
    } else {
      // Failed challenge - opponent was truthful
      result = CHALLENGE_RESULTS.FAILED;
      this.addScore(-SCORING.CHALLENGE_PENALTY); // Penalty for wrong challenge
    }

    // Update behavior profiles
    this.updateBehaviorProfile("challengeMade", {
      opponent: opponent.id,
      wasCorrect: result === CHALLENGE_RESULTS.SUCCESSFUL,
      challengedCard: challengedCard.type,
      claimedType: challengedCard.claimedType,
    });

    opponent.updateBehaviorProfile("challengeReceived", {
      challenger: this.id,
      wasBluff: isBluff,
      cardType: challengedCard.type,
      claimedType: challengedCard.claimedType,
    });

    if (DEBUG.ENABLED) {
      console.log(`${this.name} challenged ${opponent.name}: ${result}`);
    }

    eventBus.emit(EVENTS.CHALLENGE_MADE, {
      challenger: this,
      opponent: opponent,
      card: challengedCard,
      result: result,
    });

    return result;
  }

  /**
   * Add points to player's score
   * @param {number} points - Points to add (can be negative)
   */
  addScore(points) {
    const oldScore = this.score;
    this.score = Math.max(0, this.score + points);

    if (points > 0) {
      this.stats.totalPoints += points;
    }

    if (DEBUG.ENABLED && points !== 0) {
      console.log(
        `${this.name} score: ${oldScore} → ${this.score} (${
          points > 0 ? "+" : ""
        }${points})`
      );
    }

    eventBus.emit(EVENTS.SCORE_UPDATE, {
      player: this,
      oldScore: oldScore,
      newScore: this.score,
      pointsAdded: points,
    });
  }

  /**
   * Check if player has won the game
   * @param {Player} opponent - The opponent to compare against
   * @returns {boolean} True if this player has won
   */
  hasWon(opponent) {
    return (
      this.score >= GAME_CONFIG.VICTORY_POINTS &&
      this.score >= opponent.score + GAME_CONFIG.MIN_VICTORY_LEAD
    );
  }

  /**
   * Get all cards of a specific type in hand
   * @param {string} cardType - Type of cards to find
   * @returns {Array<Card>} Cards of specified type
   */
  getCardsOfType(cardType) {
    return this.hand.filter((card) => card.type === cardType);
  }

  /**
   * Get hand composition
   * @returns {Object} Count of each card type in hand
   */
  getHandComposition() {
    const composition = {};
    for (const type of Object.values(CARD_TYPES)) {
      composition[type] = 0;
    }

    for (const card of this.hand) {
      composition[card.type]++;
    }

    return composition;
  }

  /**
   * Check if player can make a move (has cards in hand)
   * @returns {boolean} True if player can move
   */
  canMove() {
    return this.hand.length > 0;
  }

  /**
   * Get player's cards currently on the grid
   * @returns {Array<Card>} Placed cards
   */
  getPlacedCards() {
    return [...this.placedCards];
  }

  /**
   * Update behavior profile based on action
   * @param {string} actionType - Type of action performed
   * @param {Object} actionData - Data about the action
   */
  updateBehaviorProfile(actionType, actionData) {
    // Keep recent actions history
    this.behaviorProfile.recentActions.push({
      type: actionType,
      data: actionData,
      timestamp: Date.now(),
    });

    // Keep only recent actions (last 20)
    if (this.behaviorProfile.recentActions.length > 20) {
      this.behaviorProfile.recentActions.shift();
    }

    // Update specific behavior metrics
    switch (actionType) {
      case "cardPlayed":
        // Track bluffing frequency
        const totalPlays = this.stats.cardsPlayed;
        this.behaviorProfile.bluffingFrequency =
          this.stats.bluffsAttempted / totalPlays || 0;

        // Track card type preferences
        const actualType = actionData.actualType;
        this.behaviorProfile.cardTypePreferences[actualType] =
          (this.behaviorProfile.cardTypePreferences[actualType] || 0) + 1;

        // Track position preferences
        const position = actionData.position;
        this.behaviorProfile.positionPreferences[position] =
          (this.behaviorProfile.positionPreferences[position] || 0) + 1;
        break;

      case "challengeMade":
        // Track challenging frequency
        const totalChallenges = this.stats.challengesMade;
        this.behaviorProfile.challengingFrequency =
          totalChallenges / Math.max(1, this.stats.cardsPlayed) || 0;
        break;
    }
  }

  /**
   * Get behavioral tendencies for AI adaptation
   * @returns {Object} Behavior analysis
   */
  getBehaviorAnalysis() {
    return {
      isBluffer: this.behaviorProfile.bluffingFrequency > 0.4,
      isAggressive: this.behaviorProfile.challengingFrequency > 0.3,
      favoriteCardType: this.getMostUsedCardType(),
      favoritePositions: this.getMostUsedPositions(),
      predictability: this.calculatePredictability(),
    };
  }

  /**
   * Get most frequently used card type
   * @returns {string} Most used card type
   */
  getMostUsedCardType() {
    const preferences = this.behaviorProfile.cardTypePreferences;
    let maxCount = 0;
    let favoriteType = CARD_TYPES.ROCK;

    for (const [type, count] of Object.entries(preferences)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteType = type;
      }
    }

    return favoriteType;
  }

  /**
   * Get most frequently used positions
   * @returns {Array<number>} Top 3 most used positions
   */
  getMostUsedPositions() {
    const preferences = this.behaviorProfile.positionPreferences;
    return Object.entries(preferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([pos]) => parseInt(pos));
  }

  /**
   * Calculate how predictable the player's behavior is
   * @returns {number} Predictability score (0-1, higher = more predictable)
   */
  calculatePredictability() {
    const recentActions = this.behaviorProfile.recentActions.slice(-10);
    if (recentActions.length < 5) return 0.5; // Not enough data

    // Analyze patterns in recent actions
    let patterns = 0;
    let totalActions = recentActions.length;

    // Check for repeated bluffing patterns
    const bluffPattern = recentActions.filter(
      (a) => a.type === "cardPlayed" && a.data.wasBluff
    ).length;
    if (
      bluffPattern / totalActions > 0.7 ||
      bluffPattern / totalActions < 0.2
    ) {
      patterns++;
    }

    // Check for position patterns
    const positions = recentActions
      .filter((a) => a.type === "cardPlayed")
      .map((a) => a.data.position);
    const uniquePositions = new Set(positions).size;
    if (uniquePositions < positions.length * 0.6) {
      patterns++;
    }

    return Math.min(1, patterns / 3);
  }

  /**
   * Reset player for new game
   */
  resetForNewGame() {
    this.score = 0;
    this.hand = [];
    this.placedCards = [];
    this.selectedCard = null;
    this.isActive = false;

    // Reset game-specific stats but keep long-term behavior data
    this.stats.gamesPlayed++;

    if (DEBUG.ENABLED) {
      console.log(`${this.name} reset for new game`);
    }
  }

  /**
   * Reset player for new round
   */
  resetForNewRound() {
    this.hand = [];
    this.placedCards = [];
    this.selectedCard = null;

    if (DEBUG.ENABLED) {
      console.log(`${this.name} reset for new round`);
    }
  }

  /**
   * Serialize player data for saving
   * @returns {Object} Serialized player data
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      score: this.score,
      stats: { ...this.stats },
      behaviorProfile: {
        ...this.behaviorProfile,
        recentActions: this.behaviorProfile.recentActions.slice(-10), // Keep only recent
      },
      hand: this.hand.map((card) => card.serialize()),
      placedCards: this.placedCards.map((card) => card.serialize()),
      selectedCard: this.selectedCard ? this.selectedCard.id : null,
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create player from serialized data
   * @param {Object} data - Serialized player data
   * @returns {Player} Player instance
   */
  static deserialize(data) {
    const player = new Player(data.id, data.name, data.type);
    player.score = data.score;
    player.stats = { ...player.stats, ...data.stats };
    player.behaviorProfile = {
      ...player.behaviorProfile,
      ...data.behaviorProfile,
    };
    player.isActive = data.isActive;
    player.createdAt = data.createdAt;

    // Note: Hand and placed cards will be restored by game logic
    return player;
  }

  /**
   * Get a summary of the player
   * @returns {string} Player summary
   */
  toString() {
    return `${this.name} (${this.type}) - Score: ${this.score}, Hand: ${this.hand.length} cards`;
  }

  /**
   * Validate player state
   * @returns {boolean} True if player state is valid
   */
  validate() {
    // Check basic properties
    if (!this.id || !this.name) {
      console.error("Player missing required properties");
      return false;
    }

    // Check score
    if (this.score < 0) {
      console.error("Player has negative score");
      return false;
    }

    // Check hand
    for (const card of this.hand) {
      if (!(card instanceof Card) || !card.validate()) {
        console.error("Invalid card in player hand");
        return false;
      }
    }

    // Check placed cards
    for (const card of this.placedCards) {
      if (!(card instanceof Card) || !card.validate()) {
        console.error("Invalid placed card");
        return false;
      }
    }

    return true;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Player;
}

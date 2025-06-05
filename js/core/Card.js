/**
 * Bluff Battle - Card Class
 * Represents a single game card with type, state, and battle logic
 */

class Card {
  constructor(type, id = null) {
    // Validate card type
    if (!Object.values(CARD_TYPES).includes(type)) {
      throw new Error(`Invalid card type: ${type}`);
    }

    this.id = id || this.generateId();
    this.type = type;
    this.state = CARD_STATES.IN_HAND;
    this.claimedType = null; // What the player claims this card is
    this.owner = null; // Player who owns this card
    this.position = null; // Grid position if placed
    this.isRevealed = false; // Whether the actual type is visible
    this.battleHistory = []; // Record of battles this card participated in

    // Metadata
    this.createdAt = Date.now();
    this.placedAt = null;
    this.revealedAt = null;
  }

  /**
   * Generate a unique ID for this card
   * @returns {string} Unique card ID
   */
  generateId() {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get card display information
   * @returns {Object} Display information for this card type
   */
  getInfo() {
    return CARD_INFO[this.type];
  }

  /**
   * Get the icon for this card type
   * @returns {string} Emoji icon
   */
  getIcon() {
    return this.getInfo().icon;
  }

  /**
   * Get the display name for this card type
   * @returns {string} Card type name
   */
  getName() {
    return this.getInfo().name;
  }

  /**
   * Get what this card type defeats
   * @returns {string} Card type this defeats
   */
  getDefeats() {
    return this.getInfo().defeats;
  }

  /**
   * Get what defeats this card type
   * @returns {string} Card type that defeats this
   */
  getDefeatedBy() {
    return this.getInfo().defeatedBy;
  }

  /**
   * Set the owner of this card
   * @param {Player} player - The player who owns this card
   */
  setOwner(player) {
    this.owner = player;
  }

  /**
   * Set the claimed type for this card
   * @param {string} claimedType - What the player claims this card is
   */
  setClaim(claimedType) {
    if (!Object.values(CARD_TYPES).includes(claimedType)) {
      throw new Error(`Invalid claimed type: ${claimedType}`);
    }
    this.claimedType = claimedType;
  }

  /**
   * Check if this card is bluffing (claimed type different from actual type)
   * @returns {boolean} True if the card is bluffing
   */
  isBluffing() {
    return this.claimedType !== null && this.claimedType !== this.type;
  }

  /**
   * Check if this card is telling the truth
   * @returns {boolean} True if the card claim matches actual type
   */
  isTruthful() {
    return this.claimedType !== null && this.claimedType === this.type;
  }

  /**
   * Place this card at a grid position
   * @param {number} position - Grid position (0-14)
   */
  place(position) {
    if (position < 0 || position >= GAME_CONFIG.TOTAL_POSITIONS) {
      throw new Error(`Invalid grid position: ${position}`);
    }

    this.position = position;
    this.state = CARD_STATES.PLACED;
    this.placedAt = Date.now();

    if (DEBUG.ENABLED) {
      console.log(`Card ${this.id} placed at position ${position}`);
    }
  }

  /**
   * Reveal this card's actual type
   */
  reveal() {
    this.isRevealed = true;
    this.state = CARD_STATES.REVEALED;
    this.revealedAt = Date.now();

    if (DEBUG.ENABLED) {
      console.log(`Card ${this.id} revealed as ${this.type}`);
    }
  }

  /**
   * Battle this card against another card
   * @param {Card} opponent - The opposing card
   * @returns {string} Battle result from this card's perspective
   */
  battleAgainst(opponent) {
    if (!(opponent instanceof Card)) {
      throw new Error("Opponent must be a Card instance");
    }

    const result = this.determineBattleResult(this.type, opponent.type);

    // Record battle in history
    const battleRecord = {
      timestamp: Date.now(),
      opponent: opponent.id,
      opponentType: opponent.type,
      result: result,
      myType: this.type,
      position: this.position,
      opponentPosition: opponent.position,
    };

    this.battleHistory.push(battleRecord);
    opponent.battleHistory.push({
      ...battleRecord,
      result:
        result === BATTLE_RESULTS.WIN
          ? BATTLE_RESULTS.LOSE
          : result === BATTLE_RESULTS.LOSE
          ? BATTLE_RESULTS.WIN
          : result,
      opponent: this.id,
      opponentType: this.type,
      myType: opponent.type,
      position: opponent.position,
      opponentPosition: this.position,
    });

    if (DEBUG.ENABLED) {
      console.log(`Battle: ${this.type} vs ${opponent.type} = ${result}`);
    }

    return result;
  }

  /**
   * Determine the result of a battle between two card types
   * @param {string} type1 - First card type
   * @param {string} type2 - Second card type
   * @returns {string} Battle result from type1's perspective
   */
  determineBattleResult(type1, type2) {
    if (type1 === type2) {
      // Same type results in a tie - could be handled differently
      return BATTLE_RESULTS.ADVANCE; // Both advance or neither?
    }

    const type1Info = CARD_INFO[type1];
    if (type1Info.defeats === type2) {
      return BATTLE_RESULTS.WIN;
    } else {
      return BATTLE_RESULTS.LOSE;
    }
  }

  /**
   * Check if this card can defeat another card type
   * @param {string} otherType - The other card type
   * @returns {boolean} True if this card defeats the other type
   */
  canDefeat(otherType) {
    return this.getDefeats() === otherType;
  }

  /**
   * Get battle statistics for this card
   * @returns {Object} Battle statistics
   */
  getBattleStats() {
    const wins = this.battleHistory.filter(
      (b) => b.result === BATTLE_RESULTS.WIN
    ).length;
    const losses = this.battleHistory.filter(
      (b) => b.result === BATTLE_RESULTS.LOSE
    ).length;
    const advances = this.battleHistory.filter(
      (b) => b.result === BATTLE_RESULTS.ADVANCE
    ).length;

    return {
      totalBattles: this.battleHistory.length,
      wins,
      losses,
      advances,
      winRate:
        this.battleHistory.length > 0 ? wins / this.battleHistory.length : 0,
    };
  }

  /**
   * Reset card to initial state (for reuse)
   */
  reset() {
    this.state = CARD_STATES.IN_HAND;
    this.claimedType = null;
    this.position = null;
    this.isRevealed = false;
    this.placedAt = null;
    this.revealedAt = null;
    // Keep battle history for AI learning purposes
  }

  /**
   * Create a copy of this card
   * @returns {Card} New card instance with same properties
   */
  clone() {
    const clonedCard = new Card(this.type, `${this.id}_clone`);
    clonedCard.state = this.state;
    clonedCard.claimedType = this.claimedType;
    clonedCard.owner = this.owner;
    clonedCard.position = this.position;
    clonedCard.isRevealed = this.isRevealed;
    clonedCard.battleHistory = [...this.battleHistory];
    return clonedCard;
  }

  /**
   * Serialize card data for saving/transmission
   * @returns {Object} Serialized card data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      claimedType: this.claimedType,
      position: this.position,
      isRevealed: this.isRevealed,
      createdAt: this.createdAt,
      placedAt: this.placedAt,
      revealedAt: this.revealedAt,
      battleHistory: this.battleHistory,
      owner: this.owner ? this.owner.id : null,
    };
  }

  /**
   * Create a card from serialized data
   * @param {Object} data - Serialized card data
   * @returns {Card} New card instance
   */
  static deserialize(data) {
    const card = new Card(data.type, data.id);
    card.state = data.state;
    card.claimedType = data.claimedType;
    card.position = data.position;
    card.isRevealed = data.isRevealed;
    card.createdAt = data.createdAt;
    card.placedAt = data.placedAt;
    card.revealedAt = data.revealedAt;
    card.battleHistory = data.battleHistory || [];
    // Owner will be set by the game when deserializing
    return card;
  }

  /**
   * Get a human-readable description of the card
   * @returns {string} Card description
   */
  toString() {
    let description = `${this.getName()} (${this.id})`;

    if (this.claimedType && this.claimedType !== this.type) {
      description += ` [Claims to be ${CARD_INFO[this.claimedType].name}]`;
    }

    if (this.position !== null) {
      description += ` at position ${this.position}`;
    }

    return description;
  }

  /**
   * Check if this card is in a specific state
   * @param {string} state - State to check
   * @returns {boolean} True if in the specified state
   */
  isInState(state) {
    return this.state === state;
  }

  /**
   * Check if this card is currently placed on the grid
   * @returns {boolean} True if placed
   */
  isPlaced() {
    return (
      this.state === CARD_STATES.PLACED || this.state === CARD_STATES.REVEALED
    );
  }

  /**
   * Check if this card is currently in a player's hand
   * @returns {boolean} True if in hand
   */
  isInHand() {
    return (
      this.state === CARD_STATES.IN_HAND || this.state === CARD_STATES.SELECTED
    );
  }

  /**
   * Get the age of this card in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return Date.now() - this.createdAt;
  }

  /**
   * Get time since card was placed (if placed)
   * @returns {number|null} Time since placement in milliseconds, or null if not placed
   */
  getTimeSincePlacement() {
    return this.placedAt ? Date.now() - this.placedAt : null;
  }

  /**
   * Check if this card has battle experience
   * @returns {boolean} True if the card has participated in battles
   */
  hasBattleExperience() {
    return this.battleHistory.length > 0;
  }

  /**
   * Get the most recent battle result
   * @returns {Object|null} Most recent battle record or null
   */
  getLastBattle() {
    return this.battleHistory.length > 0
      ? this.battleHistory[this.battleHistory.length - 1]
      : null;
  }

  /**
   * Check if this card has ever battled a specific card
   * @param {string} cardId - ID of the card to check
   * @returns {boolean} True if these cards have battled
   */
  hasBattledCard(cardId) {
    return this.battleHistory.some((battle) => battle.opponent === cardId);
  }

  /**
   * Get battle history against a specific opponent
   * @param {string} cardId - ID of the opponent card
   * @returns {Array} Array of battle records against this opponent
   */
  getBattleHistoryWith(cardId) {
    return this.battleHistory.filter((battle) => battle.opponent === cardId);
  }

  /**
   * Validate card state consistency
   * @returns {boolean} True if card state is valid
   */
  validate() {
    // Check if state is valid
    if (!Object.values(CARD_STATES).includes(this.state)) {
      console.error(`Invalid card state: ${this.state}`);
      return false;
    }

    // Check if type is valid
    if (!Object.values(CARD_TYPES).includes(this.type)) {
      console.error(`Invalid card type: ${this.type}`);
      return false;
    }

    // Check if claimed type is valid (if set)
    if (
      this.claimedType &&
      !Object.values(CARD_TYPES).includes(this.claimedType)
    ) {
      console.error(`Invalid claimed type: ${this.claimedType}`);
      return false;
    }

    // Check position validity if placed
    if (
      this.isPlaced() &&
      (this.position < 0 || this.position >= GAME_CONFIG.TOTAL_POSITIONS)
    ) {
      console.error(`Invalid position for placed card: ${this.position}`);
      return false;
    }

    // Check state consistency
    if (this.isPlaced() && this.position === null) {
      console.error("Card marked as placed but has no position");
      return false;
    }

    return true;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Card;
}

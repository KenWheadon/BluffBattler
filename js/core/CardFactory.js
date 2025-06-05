/**
 * Bluff Battle - Card Factory
 * Handles creation and management of card instances
 */

class CardFactory {
  constructor() {
    this.cardIdCounter = 0;
    this.createdCards = new Map(); // Track all created cards
    this.cardPools = new Map(); // Reusable card pools for efficiency

    if (DEBUG.ENABLED) {
      console.log("CardFactory initialized");
    }
  }

  /**
   * Create a single card of specified type
   * @param {string} type - Card type (rock, paper, scissors)
   * @param {string} customId - Optional custom ID
   * @returns {Card} New card instance
   */
  createCard(type, customId = null) {
    if (!Object.values(CARD_TYPES).includes(type)) {
      throw new Error(`Invalid card type: ${type}`);
    }

    const id = customId || this.generateUniqueId();
    const card = new Card(type, id);

    // Track the created card
    this.createdCards.set(id, card);

    if (DEBUG.ENABLED) {
      console.log(`Created card: ${card.toString()}`);
    }

    return card;
  }

  /**
   * Create multiple cards of specified types
   * @param {Array} types - Array of card types
   * @returns {Array<Card>} Array of card instances
   */
  createCards(types) {
    if (!Array.isArray(types)) {
      throw new Error("Types must be an array");
    }

    return types.map((type) => this.createCard(type));
  }

  /**
   * Create a balanced hand of cards
   * @param {number} handSize - Number of cards in hand (default: 5)
   * @param {boolean} balanced - Whether to create balanced distribution
   * @returns {Array<Card>} Array of cards for a hand
   */
  createHand(handSize = GAME_CONFIG.CARDS_PER_HAND, balanced = true) {
    if (handSize <= 0 || handSize > 10) {
      throw new Error(`Invalid hand size: ${handSize}`);
    }

    const cards = [];

    if (balanced) {
      // Create balanced distribution
      const cardTypes = Object.values(CARD_TYPES);
      const cardsPerType = Math.floor(handSize / cardTypes.length);
      const remainder = handSize % cardTypes.length;

      // Add equal numbers of each type
      for (const type of cardTypes) {
        for (let i = 0; i < cardsPerType; i++) {
          cards.push(this.createCard(type));
        }
      }

      // Add remaining cards randomly
      for (let i = 0; i < remainder; i++) {
        const randomType =
          cardTypes[Math.floor(Math.random() * cardTypes.length)];
        cards.push(this.createCard(randomType));
      }

      // Shuffle the hand
      this.shuffleArray(cards);
    } else {
      // Create random hand
      const cardTypes = Object.values(CARD_TYPES);
      for (let i = 0; i < handSize; i++) {
        const randomType =
          cardTypes[Math.floor(Math.random() * cardTypes.length)];
        cards.push(this.createCard(randomType));
      }
    }

    if (DEBUG.ENABLED) {
      console.log(
        `Created hand of ${handSize} cards:`,
        cards.map((c) => c.type).join(", ")
      );
    }

    return cards;
  }

  /**
   * Create a complete deck with specified distribution
   * @param {Object} distribution - Distribution of card types {rock: 5, paper: 5, scissors: 5}
   * @returns {Array<Card>} Complete deck of cards
   */
  createDeck(distribution = null) {
    if (distribution === null) {
      // Default balanced distribution
      distribution = {
        [CARD_TYPES.ROCK]: 5,
        [CARD_TYPES.PAPER]: 5,
        [CARD_TYPES.SCISSORS]: 5,
      };
    }

    const deck = [];

    for (const [type, count] of Object.entries(distribution)) {
      if (!Object.values(CARD_TYPES).includes(type)) {
        throw new Error(`Invalid card type in distribution: ${type}`);
      }

      for (let i = 0; i < count; i++) {
        deck.push(this.createCard(type));
      }
    }

    this.shuffleArray(deck);

    if (DEBUG.ENABLED) {
      console.log(`Created deck with ${deck.length} cards`);
    }

    return deck;
  }

  /**
   * Create cards optimized for specific strategy
   * @param {string} strategy - Strategy type ('aggressive', 'defensive', 'balanced')
   * @param {number} count - Number of cards to create
   * @returns {Array<Card>} Strategy-optimized cards
   */
  createStrategyCards(strategy, count = GAME_CONFIG.CARDS_PER_HAND) {
    const cards = [];

    switch (strategy.toLowerCase()) {
      case "aggressive":
        // Favor Rock and Scissors for aggressive play
        const aggressiveTypes = [
          CARD_TYPES.ROCK,
          CARD_TYPES.SCISSORS,
          CARD_TYPES.ROCK,
        ];
        for (let i = 0; i < count; i++) {
          const type = aggressiveTypes[i % aggressiveTypes.length];
          cards.push(this.createCard(type));
        }
        break;

      case "defensive":
        // Favor Paper for defensive play
        const defensiveTypes = [
          CARD_TYPES.PAPER,
          CARD_TYPES.ROCK,
          CARD_TYPES.PAPER,
        ];
        for (let i = 0; i < count; i++) {
          const type = defensiveTypes[i % defensiveTypes.length];
          cards.push(this.createCard(type));
        }
        break;

      case "balanced":
      default:
        return this.createHand(count, true);
    }

    this.shuffleArray(cards);
    return cards;
  }

  /**
   * Clone an existing card
   * @param {Card} originalCard - Card to clone
   * @returns {Card} Cloned card with new ID
   */
  cloneCard(originalCard) {
    if (!(originalCard instanceof Card)) {
      throw new Error("Original must be a Card instance");
    }

    const newCard = this.createCard(originalCard.type);
    newCard.claimedType = originalCard.claimedType;
    // Don't copy state, position, or battle history for clones

    return newCard;
  }

  /**
   * Get a card from the reuse pool or create new one
   * @param {string} type - Card type to get
   * @returns {Card} Card instance
   */
  getPooledCard(type) {
    if (!this.cardPools.has(type)) {
      this.cardPools.set(type, []);
    }

    const pool = this.cardPools.get(type);

    if (pool.length > 0) {
      const card = pool.pop();
      card.reset(); // Reset to initial state
      return card;
    } else {
      return this.createCard(type);
    }
  }

  /**
   * Return a card to the reuse pool
   * @param {Card} card - Card to return to pool
   */
  returnToPool(card) {
    if (!(card instanceof Card)) {
      return;
    }

    const type = card.type;
    if (!this.cardPools.has(type)) {
      this.cardPools.set(type, []);
    }

    card.reset();
    this.cardPools.get(type).push(card);
  }

  /**
   * Generate a unique card ID
   * @returns {string} Unique ID
   */
  generateUniqueId() {
    return `card_${++this.cardIdCounter}_${Date.now()}`;
  }

  /**
   * Get a card by its ID
   * @param {string} cardId - ID of the card to find
   * @returns {Card|null} Card instance or null if not found
   */
  getCardById(cardId) {
    return this.createdCards.get(cardId) || null;
  }

  /**
   * Get all cards of a specific type
   * @param {string} type - Card type to find
   * @returns {Array<Card>} Array of cards of specified type
   */
  getCardsByType(type) {
    const cards = [];
    for (const card of this.createdCards.values()) {
      if (card.type === type) {
        cards.push(card);
      }
    }
    return cards;
  }

  /**
   * Get statistics about created cards
   * @returns {Object} Card creation statistics
   */
  getStatistics() {
    const stats = {
      totalCreated: this.createdCards.size,
      byType: {},
      poolSizes: {},
      totalPooled: 0,
    };

    // Count by type
    for (const type of Object.values(CARD_TYPES)) {
      stats.byType[type] = this.getCardsByType(type).length;
      stats.poolSizes[type] = this.cardPools.has(type)
        ? this.cardPools.get(type).length
        : 0;
      stats.totalPooled += stats.poolSizes[type];
    }

    return stats;
  }

  /**
   * Validate card distribution in an array
   * @param {Array<Card>} cards - Cards to validate
   * @returns {Object} Validation result
   */
  validateDistribution(cards) {
    const distribution = {};
    let totalCards = 0;

    for (const card of cards) {
      if (!(card instanceof Card)) {
        return { valid: false, error: "Invalid card instance found" };
      }

      distribution[card.type] = (distribution[card.type] || 0) + 1;
      totalCards++;
    }

    return {
      valid: true,
      totalCards,
      distribution,
      isBalanced: this.isBalancedDistribution(distribution),
    };
  }

  /**
   * Check if a distribution is balanced
   * @param {Object} distribution - Card type distribution
   * @returns {boolean} True if balanced
   */
  isBalancedDistribution(distribution) {
    const counts = Object.values(distribution);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    return max - min <= 1; // Allow difference of 1
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Create cards for testing purposes
   * @param {string} scenario - Test scenario name
   * @returns {Array<Card>} Test cards
   */
  createTestCards(scenario) {
    switch (scenario) {
      case "all_rock":
        return this.createCards([
          CARD_TYPES.ROCK,
          CARD_TYPES.ROCK,
          CARD_TYPES.ROCK,
        ]);

      case "rock_paper_scissors":
        return this.createCards([
          CARD_TYPES.ROCK,
          CARD_TYPES.PAPER,
          CARD_TYPES.SCISSORS,
        ]);

      case "bluff_test":
        const cards = this.createCards([CARD_TYPES.ROCK, CARD_TYPES.PAPER]);
        cards[0].setClaim(CARD_TYPES.SCISSORS); // Rock claiming to be Scissors
        cards[1].setClaim(CARD_TYPES.PAPER); // Paper telling truth
        return cards;

      default:
        return this.createHand();
    }
  }

  /**
   * Clear all created cards and pools
   */
  clear() {
    this.createdCards.clear();
    this.cardPools.clear();
    this.cardIdCounter = 0;

    if (DEBUG.ENABLED) {
      console.log("CardFactory cleared");
    }
  }

  /**
   * Clean up cards that are no longer needed
   * @param {Array<string>} activeCardIds - IDs of cards currently in use
   */
  cleanup(activeCardIds = []) {
    const activeSet = new Set(activeCardIds);
    const toRemove = [];

    for (const [id, card] of this.createdCards.entries()) {
      if (!activeSet.has(id) && !card.isPlaced()) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.createdCards.delete(id);
    }

    if (DEBUG.ENABLED && toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} unused cards`);
    }
  }
}

// Create global card factory instance
const cardFactory = new CardFactory();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CardFactory, cardFactory };
}

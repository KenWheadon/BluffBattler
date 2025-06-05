/**
 * Bluff Battle - Input Validator
 * Validation functions for game inputs and data
 */

class Validator {
  constructor() {
    if (DEBUG.ENABLED) {
      console.log("Validator initialized");
    }
  }

  /**
   * Validate card play input
   * @param {Card} card - Card to validate
   * @param {number} position - Grid position
   * @param {string} claimedType - Claimed card type
   * @returns {Object} Validation result
   */
  static validateCardPlay(card, position, claimedType) {
    const errors = [];

    // Validate card
    if (!card || !(card instanceof Card)) {
      errors.push("Invalid card instance");
    } else if (!card.validate()) {
      errors.push("Card failed internal validation");
    }

    // Validate position
    if (typeof position !== "number") {
      errors.push("Position must be a number");
    } else if (position < 0 || position >= GAME_CONFIG.TOTAL_POSITIONS) {
      errors.push(
        `Position must be between 0 and ${GAME_CONFIG.TOTAL_POSITIONS - 1}`
      );
    }

    // Validate claimed type
    if (!claimedType || typeof claimedType !== "string") {
      errors.push("Claimed type must be a non-empty string");
    } else if (!Object.values(CARD_TYPES).includes(claimedType)) {
      errors.push("Invalid claimed card type");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate player data
   * @param {Object} playerData - Player data to validate
   * @returns {Object} Validation result
   */
  static validatePlayerData(playerData) {
    const errors = [];

    if (!playerData || typeof playerData !== "object") {
      errors.push("Player data must be an object");
      return { valid: false, errors };
    }

    // Required fields
    if (!playerData.id || typeof playerData.id !== "string") {
      errors.push("Player ID is required and must be a string");
    }

    if (!playerData.name || typeof playerData.name !== "string") {
      errors.push("Player name is required and must be a string");
    }

    if (
      !playerData.type ||
      !Object.values(PLAYER_TYPES).includes(playerData.type)
    ) {
      errors.push("Invalid player type");
    }

    // Optional numeric fields
    if (
      playerData.score !== undefined &&
      (typeof playerData.score !== "number" || playerData.score < 0)
    ) {
      errors.push("Player score must be a non-negative number");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate game configuration
   * @param {Object} config - Game configuration
   * @returns {Object} Validation result
   */
  static validateGameConfig(config) {
    const errors = [];

    if (!config || typeof config !== "object") {
      errors.push("Game config must be an object");
      return { valid: false, errors };
    }

    // Grid dimensions
    if (config.gridWidth !== undefined) {
      if (
        typeof config.gridWidth !== "number" ||
        config.gridWidth < 3 ||
        config.gridWidth > 10
      ) {
        errors.push("Grid width must be between 3 and 10");
      }
    }

    if (config.gridHeight !== undefined) {
      if (
        typeof config.gridHeight !== "number" ||
        config.gridHeight < 3 ||
        config.gridHeight > 10
      ) {
        errors.push("Grid height must be between 3 and 10");
      }
    }

    // Victory conditions
    if (config.victoryPoints !== undefined) {
      if (
        typeof config.victoryPoints !== "number" ||
        config.victoryPoints < 5 ||
        config.victoryPoints > 50
      ) {
        errors.push("Victory points must be between 5 and 50");
      }
    }

    if (config.minVictoryLead !== undefined) {
      if (
        typeof config.minVictoryLead !== "number" ||
        config.minVictoryLead < 1 ||
        config.minVictoryLead > 10
      ) {
        errors.push("Minimum victory lead must be between 1 and 10");
      }
    }

    // Hand size
    if (config.cardsPerHand !== undefined) {
      if (
        typeof config.cardsPerHand !== "number" ||
        config.cardsPerHand < 3 ||
        config.cardsPerHand > 10
      ) {
        errors.push("Cards per hand must be between 3 and 10");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate grid position
   * @param {number} position - Position to validate
   * @param {GridSystem} gridSystem - Grid system instance
   * @returns {Object} Validation result
   */
  static validateGridPosition(position, gridSystem) {
    const errors = [];

    if (typeof position !== "number") {
      errors.push("Position must be a number");
    } else if (!Number.isInteger(position)) {
      errors.push("Position must be an integer");
    } else if (position < 0) {
      errors.push("Position cannot be negative");
    } else if (gridSystem && position >= gridSystem.totalPositions) {
      errors.push(`Position must be less than ${gridSystem.totalPositions}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate challenge attempt
   * @param {Player} challenger - Player making challenge
   * @param {Object} challengeablePlay - Play being challenged
   * @returns {Object} Validation result
   */
  static validateChallenge(challenger, challengeablePlay) {
    const errors = [];

    // Validate challenger
    if (!challenger || !(challenger instanceof Player)) {
      errors.push("Invalid challenger");
    }

    // Validate challengeable play
    if (!challengeablePlay) {
      errors.push("No challengeable play available");
    } else {
      if (!challengeablePlay.player) {
        errors.push("Challengeable play missing player");
      } else if (challengeablePlay.player === challenger) {
        errors.push("Cannot challenge your own play");
      }

      if (!challengeablePlay.card) {
        errors.push("Challengeable play missing card");
      }

      if (!challengeablePlay.claimedType) {
        errors.push("Challengeable play missing claimed type");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate battle system state
   * @param {BattleSystem} battleSystem - Battle system to validate
   * @returns {Object} Validation result
   */
  static validateBattleSystem(battleSystem) {
    const errors = [];

    if (!battleSystem || !(battleSystem instanceof BattleSystem)) {
      errors.push("Invalid battle system instance");
      return { valid: false, errors };
    }

    if (!battleSystem.gridSystem) {
      errors.push("Battle system missing grid system reference");
    }

    if (battleSystem.isProcessing === undefined) {
      errors.push("Battle system missing processing state");
    }

    if (!Array.isArray(battleSystem.battleQueue)) {
      errors.push("Battle system queue must be an array");
    }

    if (!Array.isArray(battleSystem.battleResults)) {
      errors.push("Battle system results must be an array");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate event data
   * @param {string} eventType - Type of event
   * @param {*} eventData - Event data to validate
   * @returns {Object} Validation result
   */
  static validateEventData(eventType, eventData) {
    const errors = [];

    if (!eventType || typeof eventType !== "string") {
      errors.push("Event type must be a non-empty string");
    }

    // Validate specific event types
    switch (eventType) {
      case EVENTS.CARD_SELECTED:
        if (eventData && eventData.card && !(eventData.card instanceof Card)) {
          errors.push("Card event data must contain valid card instance");
        }
        break;

      case EVENTS.SCORE_UPDATE:
        if (eventData) {
          if (eventData.player && !(eventData.player instanceof Player)) {
            errors.push("Score event must contain valid player instance");
          }
          if (
            eventData.pointsAdded !== undefined &&
            typeof eventData.pointsAdded !== "number"
          ) {
            errors.push("Score event points must be a number");
          }
        }
        break;

      case EVENTS.BATTLE_RESULT:
        if (eventData) {
          if (!eventData.outcome || typeof eventData.outcome !== "string") {
            errors.push("Battle result must have outcome string");
          }
          if (
            eventData.pointsAwarded !== undefined &&
            typeof eventData.pointsAwarded !== "number"
          ) {
            errors.push("Battle result points must be a number");
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate save data structure
   * @param {Object} saveData - Save data to validate
   * @returns {Object} Validation result
   */
  static validateSaveData(saveData) {
    const errors = [];

    if (!saveData || typeof saveData !== "object") {
      errors.push("Save data must be an object");
      return { valid: false, errors };
    }

    // Required fields
    const requiredFields = ["version", "timestamp", "gameState", "players"];
    for (const field of requiredFields) {
      if (!(field in saveData)) {
        errors.push(`Save data missing required field: ${field}`);
      }
    }

    // Validate version
    if (saveData.version && typeof saveData.version !== "string") {
      errors.push("Save data version must be a string");
    }

    // Validate timestamp
    if (
      saveData.timestamp &&
      (typeof saveData.timestamp !== "number" || saveData.timestamp <= 0)
    ) {
      errors.push("Save data timestamp must be a positive number");
    }

    // Validate players array
    if (saveData.players && !Array.isArray(saveData.players)) {
      errors.push("Save data players must be an array");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate UI element reference
   * @param {HTMLElement} element - DOM element to validate
   * @param {string} elementName - Name of element for error messages
   * @returns {Object} Validation result
   */
  static validateUIElement(element, elementName) {
    const errors = [];

    if (!element) {
      errors.push(`${elementName} element not found`);
    } else if (!(element instanceof HTMLElement)) {
      errors.push(`${elementName} is not a valid DOM element`);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Validate array of cards
   * @param {Array} cards - Array of cards to validate
   * @returns {Object} Validation result
   */
  static validateCardArray(cards) {
    const errors = [];

    if (!Array.isArray(cards)) {
      errors.push("Cards must be an array");
      return { valid: false, errors };
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!(card instanceof Card)) {
        errors.push(`Invalid card at index ${i}`);
      } else if (!card.validate()) {
        errors.push(`Card at index ${i} failed validation`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Sanitize string input
   * @param {string} input - String to sanitize
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized string
   */
  static sanitizeString(input, maxLength = 100) {
    if (typeof input !== "string") {
      return "";
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/[<>\"'&]/g, "") // Remove HTML/script injection chars
      .trim();

    // Limit length
    if (maxLength > 0 && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate numeric input within range
   * @param {*} value - Value to validate
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {Object} Validation result
   */
  static validateNumericRange(value, min, max) {
    const errors = [];

    if (typeof value !== "number") {
      errors.push("Value must be a number");
    } else if (isNaN(value)) {
      errors.push("Value cannot be NaN");
    } else if (!isFinite(value)) {
      errors.push("Value must be finite");
    } else if (value < min) {
      errors.push(`Value must be at least ${min}`);
    } else if (value > max) {
      errors.push(`Value must be at most ${max}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      sanitized: Math.max(min, Math.min(max, value)),
    };
  }

  /**
   * Validate and sanitize player name
   * @param {string} name - Player name to validate
   * @returns {Object} Validation result
   */
  static validatePlayerName(name) {
    const errors = [];

    if (!name || typeof name !== "string") {
      errors.push("Player name must be a non-empty string");
      return { valid: false, errors };
    }

    const sanitized = this.sanitizeString(name, 20);

    if (sanitized.length < 2) {
      errors.push("Player name must be at least 2 characters long");
    }

    if (sanitized.length > 20) {
      errors.push("Player name must be 20 characters or less");
    }

    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(sanitized)) {
      errors.push("Player name contains invalid characters");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      sanitized: sanitized,
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Validator;
}

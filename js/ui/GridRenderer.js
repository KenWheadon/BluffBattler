/**
 * Bluff Battle - Grid Renderer (FIXED)
 * Handles rendering and visual updates for the game grid
 */

class GridRenderer {
  constructor(gridElement, gridSystem) {
    this.gridElement = gridElement;
    this.gridSystem = gridSystem;
    this.positionElements = [];
    this.animationQueue = [];
    this.isAnimating = false;
    this.selectedPosition = null; // Track selected position

    if (DEBUG.ENABLED) {
      console.log("GridRenderer initialized");
    }
  }

  /**
   * Initialize the grid renderer
   */
  initialize() {
    if (!this.gridElement) {
      throw new Error("Grid element is required");
    }

    this.createGridPositions();
    this.setupEventListeners();

    if (DEBUG.ENABLED) {
      console.log(
        `Grid renderer initialized with ${this.positionElements.length} positions`
      );
    }
  }

  /**
   * Create grid position elements
   */
  createGridPositions() {
    this.gridElement.innerHTML = "";
    this.positionElements = [];

    for (let i = 0; i < this.gridSystem.totalPositions; i++) {
      const positionElement = document.createElement("div");
      positionElement.className = "grid-position";
      positionElement.dataset.position = i;

      // Add click listener
      positionElement.addEventListener("click", () => {
        this.handlePositionClick(i);
      });

      // Add hover listeners
      positionElement.addEventListener("mouseenter", () => {
        this.handlePositionHover(i, true);
      });

      positionElement.addEventListener("mouseleave", () => {
        this.handlePositionHover(i, false);
      });

      this.gridElement.appendChild(positionElement);
      this.positionElements.push(positionElement);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for grid updates
    eventBus.on("grid_updated", (data) => {
      this.render();
    });

    // Listen for card placement
    eventBus.on(EVENTS.PLAY_CONFIRMED, (data) => {
      if (data.position !== undefined) {
        this.animateCardPlacement(data.position);
      }
    });

    // Listen for battle results
    eventBus.on(EVENTS.BATTLE_RESULT, (data) => {
      if (data.battle) {
        this.animateBattleResult(data.battle, data.outcome);
      }
    });

    // FIXED: Listen for position selection updates
    eventBus.on("ui:position_selected", (data) => {
      this.setSelectedPosition(data.position);
    });

    // FIXED: Listen for selection clearing
    eventBus.on(EVENTS.PLAY_CANCELLED, () => {
      this.clearSelection();
    });
  }

  /**
   * Handle position click
   * @param {number} position - Clicked position
   */
  handlePositionClick(position) {
    // Only allow selection if position is available
    if (!this.gridSystem.isPositionAvailable(position)) {
      return;
    }

    // FIXED: Update visual selection immediately
    this.setSelectedPosition(position);

    // Then emit the event
    eventBus.emit("ui:position_selected", { position });
  }

  /**
   * FIXED: Set selected position with visual feedback
   * @param {number} position - Position to select
   */
  setSelectedPosition(position) {
    // Clear previous selection
    this.clearSelection();

    // Set new selection
    if (position >= 0 && position < this.positionElements.length) {
      this.selectedPosition = position;
      const element = this.positionElements[position];
      element.classList.add("selected");

      // Update grid system state
      this.gridSystem.setPositionState(position, POSITION_STATES.SELECTED);

      if (DEBUG.ENABLED) {
        console.log(`Grid position ${position} selected`);
      }
    }
  }

  /**
   * FIXED: Clear position selection
   */
  clearSelection() {
    if (this.selectedPosition !== null) {
      const element = this.positionElements[this.selectedPosition];
      if (element) {
        element.classList.remove("selected");
      }

      // Reset grid system state
      this.gridSystem.setPositionState(
        this.selectedPosition,
        POSITION_STATES.EMPTY
      );
      this.selectedPosition = null;
    }
  }

  /**
   * Handle position hover
   * @param {number} position - Hovered position
   * @param {boolean} isEntering - True if mouse entering
   */
  handlePositionHover(position, isEntering) {
    const element = this.positionElements[position];
    if (!element) return;

    // FIXED: Only show hover if position is available and not already selected
    if (
      isEntering &&
      this.gridSystem.isPositionAvailable(position) &&
      position !== this.selectedPosition
    ) {
      element.classList.add("hover");
    } else {
      element.classList.remove("hover");
    }
  }

  /**
   * Render the entire grid
   */
  render() {
    for (let i = 0; i < this.positionElements.length; i++) {
      this.renderPosition(i);
    }

    // FIXED: Restore selection state after render
    if (this.selectedPosition !== null) {
      const element = this.positionElements[this.selectedPosition];
      if (
        element &&
        this.gridSystem.isPositionAvailable(this.selectedPosition)
      ) {
        element.classList.add("selected");
      }
    }
  }

  /**
   * Render a specific grid position
   * @param {number} position - Position to render
   */
  renderPosition(position) {
    const positionElement = this.positionElements[position];
    const card = this.gridSystem.getCardAt(position);

    if (!positionElement) return;

    // Clear existing content and classes (except selected)
    positionElement.innerHTML = "";
    const wasSelected = positionElement.classList.contains("selected");
    positionElement.className = "grid-position";

    // FIXED: Restore selected state if it was selected
    if (wasSelected && position === this.selectedPosition) {
      positionElement.classList.add("selected");
    }

    if (card) {
      // Position is occupied
      positionElement.classList.add("occupied");

      // Add owner class
      if (card.owner) {
        if (card.owner.type === PLAYER_TYPES.HUMAN) {
          positionElement.classList.add("player-card");
        } else {
          positionElement.classList.add("ai-card");
        }
      }

      // Create card display
      const cardDisplay = this.createCardDisplay(card);
      positionElement.appendChild(cardDisplay);

      // Show revealed state
      if (card.isRevealed) {
        positionElement.classList.add("revealed");
        if (card.isBluffing()) {
          positionElement.classList.add("was-bluff");
        }
      }
    } else {
      // Position is empty
      positionElement.classList.add("empty");
    }

    // Handle other position states
    const positionState = this.gridSystem.getPositionState(position);
    if (positionState === POSITION_STATES.HIGHLIGHTED) {
      positionElement.classList.add("highlighted");
    }
  }

  /**
   * Create card display element
   * @param {Card} card - Card to display
   * @returns {HTMLElement} Card display element
   */
  createCardDisplay(card) {
    const cardElement = document.createElement("div");
    cardElement.className = "grid-card";

    // Card type (show claimed type or actual if revealed)
    const cardType = document.createElement("div");
    cardType.className = "card-type";

    if (card.isRevealed) {
      cardType.textContent = card.getIcon();
      cardType.title = `${card.getName()} (revealed)`;
    } else if (card.claimedType) {
      cardType.textContent = CARD_INFO[card.claimedType].icon;
      cardType.title = `Claimed: ${CARD_INFO[card.claimedType].name}`;
    } else {
      cardType.textContent = "?";
      cardType.title = "Unknown card";
    }

    // Card owner
    const cardOwner = document.createElement("div");
    cardOwner.className = "card-owner";
    if (card.owner) {
      cardOwner.textContent =
        card.owner.type === PLAYER_TYPES.HUMAN ? "You" : "AI";
    } else {
      cardOwner.textContent = "?";
    }

    cardElement.appendChild(cardType);
    cardElement.appendChild(cardOwner);

    return cardElement;
  }

  /**
   * Animate card placement
   * @param {number} position - Position where card was placed
   */
  animateCardPlacement(position) {
    const positionElement = this.positionElements[position];
    if (!positionElement) return;

    // FIXED: Clear selection when card is placed
    if (position === this.selectedPosition) {
      this.clearSelection();
    }

    if (DEBUG.SKIP_ANIMATIONS) {
      this.render();
      return;
    }

    positionElement.classList.add("card-placed");

    setTimeout(() => {
      positionElement.classList.remove("card-placed");
      this.renderPosition(position);
    }, ANIMATIONS.CARD_MOVE);
  }

  /**
   * Animate battle result
   * @param {Object} battle - Battle data
   * @param {string} outcome - Battle outcome
   */
  animateBattleResult(battle, outcome) {
    if (DEBUG.SKIP_ANIMATIONS) return;

    const pos1Element = this.positionElements[battle.position1];
    const pos2Element = this.positionElements[battle.position2];

    if (!pos1Element || !pos2Element) return;

    // Determine which position won
    let winnerElement, loserElement;
    if (outcome === "card1_wins") {
      winnerElement = pos1Element;
      loserElement = pos2Element;
    } else if (outcome === "card2_wins") {
      winnerElement = pos2Element;
      loserElement = pos1Element;
    } else {
      // Tie - both get tie animation
      pos1Element.classList.add("battle-tie");
      pos2Element.classList.add("battle-tie");

      setTimeout(() => {
        pos1Element.classList.remove("battle-tie");
        pos2Element.classList.remove("battle-tie");
      }, ANIMATIONS.BATTLE_RESOLVE);
      return;
    }

    // Winner animation
    winnerElement.classList.add("battle-win");
    loserElement.classList.add("battle-lose");

    setTimeout(() => {
      winnerElement.classList.remove("battle-win");
      loserElement.classList.remove("battle-lose");
    }, ANIMATIONS.BATTLE_RESOLVE);
  }

  /**
   * Highlight specific positions
   * @param {Array<number>} positions - Positions to highlight
   * @param {string} highlightClass - CSS class for highlighting
   */
  highlightPositions(positions, highlightClass = "highlighted") {
    // Clear existing highlights
    this.clearHighlights();

    for (const position of positions) {
      const element = this.positionElements[position];
      if (element) {
        element.classList.add(highlightClass);
        this.gridSystem.setPositionState(position, POSITION_STATES.HIGHLIGHTED);
      }
    }
  }

  /**
   * Clear all position highlights
   */
  clearHighlights() {
    for (let i = 0; i < this.positionElements.length; i++) {
      const element = this.positionElements[i];
      element.classList.remove("highlighted", "potential", "danger");

      // Reset position state if it was highlighted (but preserve selected state)
      if (this.gridSystem.getPositionState(i) === POSITION_STATES.HIGHLIGHTED) {
        this.gridSystem.setPositionState(
          i,
          this.gridSystem.getCardAt(i)
            ? POSITION_STATES.OCCUPIED
            : POSITION_STATES.EMPTY
        );
      }
    }
  }

  /**
   * Show recommended positions for card placement
   * @param {Array<Object>} recommendations - Array of {position, score, reasoning}
   */
  showRecommendations(recommendations) {
    this.clearHighlights();

    for (const rec of recommendations.slice(0, 3)) {
      // Show top 3
      const element = this.positionElements[rec.position];
      if (element) {
        element.classList.add("recommended");
        element.title = `Score: ${rec.score} - ${rec.reasoning}`;
      }
    }
  }

  /**
   * Clear recommendation highlights
   */
  clearRecommendations() {
    for (const element of this.positionElements) {
      element.classList.remove("recommended");
      element.removeAttribute("title");
    }
  }

  /**
   * Show battle preview for a potential placement
   * @param {number} position - Position being considered
   * @param {Card} card - Card being placed
   */
  showBattlePreview(position, card) {
    if (!this.gridSystem || !card) return;

    this.clearHighlights();

    // Get potential battle scenarios
    const scenarios = this.gridSystem.getBattlePairs();
    const relevantBattles = scenarios.filter(
      (battle) => battle.position1 === position || battle.position2 === position
    );

    for (const battle of relevantBattles) {
      const opponentPos =
        battle.position1 === position ? battle.position2 : battle.position1;
      const opponentElement = this.positionElements[opponentPos];

      if (opponentElement) {
        // Simulate battle outcome
        const opponentCard = this.gridSystem.getCardAt(opponentPos);
        if (opponentCard) {
          const wouldWin = card.canDefeat(opponentCard.type);
          opponentElement.classList.add(
            wouldWin ? "would-defeat" : "would-lose-to"
          );
        }
      }
    }
  }

  /**
   * Clear battle preview
   */
  clearBattlePreview() {
    for (const element of this.positionElements) {
      element.classList.remove("would-defeat", "would-lose-to");
    }
  }

  /**
   * Update grid size for mobile
   */
  updateForMobile() {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.gridElement.classList.add("mobile-grid");
    } else {
      this.gridElement.classList.remove("mobile-grid");
    }
  }

  /**
   * Get position element by coordinates
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {HTMLElement} Position element
   */
  getPositionElementByCoords(row, col) {
    const position = this.gridSystem.coordsToPosition(row, col);
    return this.positionElements[position];
  }

  /**
   * Flash a position (for notifications)
   * @param {number} position - Position to flash
   * @param {string} type - Flash type ('success', 'error', 'info')
   */
  flashPosition(position, type = "info") {
    const element = this.positionElements[position];
    if (!element) return;

    element.classList.add(`flash-${type}`);

    setTimeout(() => {
      element.classList.remove(`flash-${type}`);
    }, 1000);
  }

  /**
   * Create visual path between two positions
   * @param {number} startPos - Starting position
   * @param {number} endPos - Ending position
   */
  showPath(startPos, endPos) {
    const path = this.gridSystem.findPath(startPos, endPos);

    for (const position of path) {
      const element = this.positionElements[position];
      if (element) {
        element.classList.add("path-highlight");
      }
    }

    // Clear path after delay
    setTimeout(() => {
      this.clearPath();
    }, 2000);
  }

  /**
   * Clear path highlighting
   */
  clearPath() {
    for (const element of this.positionElements) {
      element.classList.remove("path-highlight");
    }
  }

  /**
   * Validate renderer state
   * @returns {boolean} True if valid
   */
  validate() {
    if (!this.gridElement) {
      console.error("GridRenderer: Missing grid element");
      return false;
    }

    if (!this.gridSystem) {
      console.error("GridRenderer: Missing grid system");
      return false;
    }

    if (this.positionElements.length !== this.gridSystem.totalPositions) {
      console.error("GridRenderer: Position element count mismatch");
      return false;
    }

    return true;
  }

  /**
   * Clean up renderer
   */
  destroy() {
    // Clear all highlights and animations
    this.clearHighlights();
    this.clearRecommendations();
    this.clearBattlePreview();
    this.clearPath();
    this.clearSelection();

    // Clear animation queue
    this.animationQueue = [];
    this.isAnimating = false;

    if (DEBUG.ENABLED) {
      console.log("GridRenderer destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GridRenderer;
}

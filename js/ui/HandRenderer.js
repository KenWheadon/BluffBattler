/**
 * Bluff Battle - Hand Renderer
 * Handles rendering and interaction for player hand
 */

class HandRenderer {
  constructor(handElement, player) {
    this.handElement = handElement;
    this.player = player;
    this.cardElements = [];
    this.selectedCardElement = null;
    this.hoveredElements = new Set();

    if (DEBUG.ENABLED) {
      console.log("HandRenderer initialized");
    }
  }

  /**
   * Initialize the hand renderer
   */
  initialize() {
    if (!this.handElement) {
      throw new Error("Hand element is required");
    }

    this.setupEventListeners();
    this.render();

    if (DEBUG.ENABLED) {
      console.log("HandRenderer initialization complete");
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for hand updates
    eventBus.on("hand_updated", (data) => {
      if (data.player === this.player) {
        this.render();
      }
    });

    // Listen for card selection events
    eventBus.on(EVENTS.CARD_SELECTED, (data) => {
      if (data.player === this.player) {
        this.updateSelection(data.card);
      }
    });

    // Listen for new cards dealt
    eventBus.on("cards_dealt", (data) => {
      if (data.player === this.player) {
        this.animateNewCards(data.cards);
      }
    });
  }

  /**
   * Render the entire hand
   */
  render() {
    if (!this.player || !this.player.hand) {
      this.renderEmptyHand();
      return;
    }

    this.handElement.innerHTML = "";
    this.cardElements = [];

    // Create card elements
    for (let i = 0; i < this.player.hand.length; i++) {
      const card = this.player.hand[i];
      const cardElement = this.createCardElement(card, i);
      this.handElement.appendChild(cardElement);
      this.cardElements.push(cardElement);
    }

    // Update selection state
    if (this.player.selectedCard) {
      this.updateSelection(this.player.selectedCard);
    }

    if (DEBUG.ENABLED) {
      console.log(`Rendered hand with ${this.player.hand.length} cards`);
    }
  }

  /**
   * Render empty hand placeholder
   */
  renderEmptyHand() {
    this.handElement.innerHTML =
      '<div class="empty-hand">No cards in hand</div>';
    this.cardElements = [];
  }

  /**
   * Create a card element
   * @param {Card} card - Card to create element for
   * @param {number} index - Index in hand
   * @returns {HTMLElement} Card element
   */
  createCardElement(card, index) {
    const cardElement = document.createElement("div");
    cardElement.className = "hand-card";
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.cardIndex = index;

    // Card icon
    const cardIcon = document.createElement("div");
    cardIcon.className = "card-icon";
    cardIcon.textContent = card.getIcon();

    // Card name
    const cardName = document.createElement("div");
    cardName.className = "card-name";
    cardName.textContent = card.getName();

    // Card details (for debugging or advanced view)
    if (DEBUG.ENABLED || this.player.type === PLAYER_TYPES.HUMAN) {
      const cardDetails = document.createElement("div");
      cardDetails.className = "card-details";
      cardDetails.textContent = `${card.type}`;
      cardElement.appendChild(cardDetails);
    }

    cardElement.appendChild(cardIcon);
    cardElement.appendChild(cardName);

    // Add event listeners
    this.addCardEventListeners(cardElement, card);

    return cardElement;
  }

  /**
   * Add event listeners to a card element
   * @param {HTMLElement} cardElement - Card element
   * @param {Card} card - Card data
   */
  addCardEventListeners(cardElement, card) {
    // Click to select
    cardElement.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleCardClick(card);
    });

    // Hover effects
    cardElement.addEventListener("mouseenter", () => {
      this.handleCardHover(cardElement, card, true);
    });

    cardElement.addEventListener("mouseleave", () => {
      this.handleCardHover(cardElement, card, false);
    });

    // Touch events for mobile
    cardElement.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleCardClick(card);
    });

    // Context menu for additional options (right-click)
    cardElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showCardContextMenu(card, e);
    });

    // Keyboard support
    cardElement.setAttribute("tabindex", "0");
    cardElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.handleCardClick(card);
      }
    });
  }

  /**
   * Handle card click
   * @param {Card} card - Clicked card
   */
  handleCardClick(card) {
    // Only allow selection if it's the player's turn and they can move
    if (this.player.type === PLAYER_TYPES.HUMAN && this.player.canMove()) {
      eventBus.emit("ui:card_selected", { card });
    }
  }

  /**
   * Handle card hover
   * @param {HTMLElement} cardElement - Card element
   * @param {Card} card - Card data
   * @param {boolean} isEntering - True if mouse entering
   */
  handleCardHover(cardElement, card, isEntering) {
    if (isEntering) {
      cardElement.classList.add("hover");
      this.hoveredElements.add(cardElement);
      this.showCardTooltip(cardElement, card);
    } else {
      cardElement.classList.remove("hover");
      this.hoveredElements.delete(cardElement);
      this.hideCardTooltip();
    }
  }

  /**
   * Show card context menu
   * @param {Card} card - Card for context menu
   * @param {Event} event - Mouse event
   */
  showCardContextMenu(card, event) {
    // Create context menu
    const contextMenu = document.createElement("div");
    contextMenu.className = "card-context-menu";
    contextMenu.innerHTML = `
      <div class="context-item" data-action="inspect">Inspect Card</div>
      <div class="context-item" data-action="stats">View Stats</div>
    `;

    // Position menu
    contextMenu.style.position = "fixed";
    contextMenu.style.left = event.clientX + "px";
    contextMenu.style.top = event.clientY + "px";
    contextMenu.style.zIndex = "1000";

    // Add to document
    document.body.appendChild(contextMenu);

    // Add event listeners
    contextMenu.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextAction(card, action);
      }
      contextMenu.remove();
    });

    // Remove on outside click
    const removeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.remove();
        document.removeEventListener("click", removeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", removeMenu), 10);
  }

  /**
   * Handle context menu action
   * @param {Card} card - Target card
   * @param {string} action - Action to perform
   */
  handleContextAction(card, action) {
    switch (action) {
      case "inspect":
        this.showCardInspector(card);
        break;
      case "stats":
        this.showCardStats(card);
        break;
    }
  }

  /**
   * Show detailed card inspector
   * @param {Card} card - Card to inspect
   */
  showCardInspector(card) {
    const content = `
      <div class="card-inspector">
        <h3>${card.getName()} ${card.getIcon()}</h3>
        <div class="card-properties">
          <div><strong>ID:</strong> ${card.id}</div>
          <div><strong>Type:</strong> ${card.type}</div>
          <div><strong>State:</strong> ${card.state}</div>
          <div><strong>Age:</strong> ${Math.round(card.getAge() / 1000)}s</div>
          <div><strong>Defeats:</strong> ${
            CARD_INFO[card.getDefeats()].name
          }</div>
          <div><strong>Defeated By:</strong> ${
            CARD_INFO[card.getDefeatedBy()].name
          }</div>
        </div>
        ${
          card.battleHistory.length > 0
            ? `
          <div class="battle-history">
            <strong>Battle History:</strong>
            <ul>
              ${card.battleHistory
                .slice(-3)
                .map(
                  (battle) => `
                <li>${battle.result} vs ${
                    CARD_INFO[battle.opponentType].name
                  }</li>
              `
                )
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
    `;

    eventBus.emit("show_modal", {
      title: "Card Inspector",
      content: content,
    });
  }

  /**
   * Show card statistics
   * @param {Card} card - Card to show stats for
   */
  showCardStats(card) {
    const stats = card.getBattleStats();
    const content = `
      <div class="card-stats">
        <h3>${card.getName()} Statistics</h3>
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-value">${stats.totalBattles}</div>
            <div class="stat-label">Total Battles</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.wins}</div>
            <div class="stat-label">Wins</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.losses}</div>
            <div class="stat-label">Losses</div>
          </div>
          <div class="stat">
            <div class="stat-value">${(stats.winRate * 100).toFixed(1)}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
        </div>
      </div>
    `;

    eventBus.emit("show_modal", {
      title: "Card Statistics",
      content: content,
    });
  }

  /**
   * Show card tooltip
   * @param {HTMLElement} cardElement - Card element
   * @param {Card} card - Card data
   */
  showCardTooltip(cardElement, card) {
    // Remove existing tooltip
    this.hideCardTooltip();

    const tooltip = document.createElement("div");
    tooltip.className = "card-tooltip";
    tooltip.id = "card-tooltip";

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-icon">${card.getIcon()}</span>
        <span class="tooltip-name">${card.getName()}</span>
      </div>
      <div class="tooltip-body">
        <div>Defeats: ${CARD_INFO[card.getDefeats()].name} ${
      CARD_INFO[card.getDefeats()].icon
    }</div>
        <div>Defeated by: ${CARD_INFO[card.getDefeatedBy()].name} ${
      CARD_INFO[card.getDefeatedBy()].icon
    }</div>
        ${
          card.battleHistory.length > 0
            ? `<div>Battles: ${card.battleHistory.length}</div>`
            : ""
        }
      </div>
    `;

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = cardElement.getBoundingClientRect();
    tooltip.style.position = "fixed";
    tooltip.style.left =
      rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + "px";

    // Adjust if tooltip goes off screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.left < 10) {
      tooltip.style.left = "10px";
    }
    if (tooltipRect.right > window.innerWidth - 10) {
      tooltip.style.left = window.innerWidth - tooltipRect.width - 10 + "px";
    }
    if (tooltipRect.top < 10) {
      tooltip.style.top = rect.bottom + 10 + "px";
    }
  }

  /**
   * Hide card tooltip
   */
  hideCardTooltip() {
    const tooltip = document.getElementById("card-tooltip");
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Update card selection visual state
   * @param {Card} selectedCard - Currently selected card
   */
  updateSelection(selectedCard) {
    // Clear previous selection
    if (this.selectedCardElement) {
      this.selectedCardElement.classList.remove("selected");
    }

    // Set new selection
    if (selectedCard) {
      this.selectedCardElement = this.findCardElement(selectedCard.id);
      if (this.selectedCardElement) {
        this.selectedCardElement.classList.add("selected");
      }
    } else {
      this.selectedCardElement = null;
    }
  }

  /**
   * Find card element by card ID
   * @param {string} cardId - Card ID to find
   * @returns {HTMLElement|null} Card element or null
   */
  findCardElement(cardId) {
    return this.handElement.querySelector(`[data-card-id="${cardId}"]`);
  }

  /**
   * Animate new cards being dealt
   * @param {Array<Card>} cards - New cards
   */
  animateNewCards(cards) {
    if (DEBUG.SKIP_ANIMATIONS) {
      this.render();
      return;
    }

    // Render first
    this.render();

    // Then animate
    const newCardElements = this.cardElements.slice(-cards.length);

    newCardElements.forEach((element, index) => {
      element.style.opacity = "0";
      element.style.transform = "translateY(50px) scale(0.8)";

      setTimeout(() => {
        element.style.transition = "all 0.5s ease";
        element.style.opacity = "1";
        element.style.transform = "translateY(0) scale(1)";

        setTimeout(() => {
          element.style.transition = "";
        }, 500);
      }, index * 100);
    });
  }

  /**
   * Animate card being played
   * @param {Card} card - Card being played
   */
  animateCardPlayed(card) {
    const cardElement = this.findCardElement(card.id);
    if (!cardElement) return;

    if (DEBUG.SKIP_ANIMATIONS) {
      this.render();
      return;
    }

    cardElement.classList.add("card-playing");

    setTimeout(() => {
      this.render(); // Re-render to remove the card
    }, ANIMATIONS.CARD_MOVE);
  }

  /**
   * Highlight cards that can be played
   * @param {Array<Card>} playableCards - Cards that can be played
   */
  highlightPlayableCards(playableCards) {
    // Clear existing highlights
    this.clearHighlights();

    const playableIds = new Set(playableCards.map((card) => card.id));

    for (const cardElement of this.cardElements) {
      const cardId = cardElement.dataset.cardId;
      if (playableIds.has(cardId)) {
        cardElement.classList.add("playable");
      } else {
        cardElement.classList.add("unplayable");
      }
    }
  }

  /**
   * Clear all card highlights
   */
  clearHighlights() {
    for (const cardElement of this.cardElements) {
      cardElement.classList.remove("playable", "unplayable", "recommended");
    }
  }

  /**
   * Show recommended cards for current situation
   * @param {Array<Object>} recommendations - Card recommendations
   */
  showRecommendations(recommendations) {
    this.clearHighlights();

    for (const rec of recommendations) {
      const cardElement = this.findCardElement(rec.card.id);
      if (cardElement) {
        cardElement.classList.add("recommended");
        cardElement.title = `Recommended: ${rec.reasoning}`;
      }
    }
  }

  /**
   * Sort hand by card type
   * @param {string} sortBy - Sort criteria ('type', 'name', 'battles')
   */
  sortHand(sortBy = "type") {
    if (!this.player || !this.player.hand) return;

    const sortedCards = [...this.player.hand];

    switch (sortBy) {
      case "type":
        sortedCards.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "name":
        sortedCards.sort((a, b) => a.getName().localeCompare(b.getName()));
        break;
      case "battles":
        sortedCards.sort(
          (a, b) => b.battleHistory.length - a.battleHistory.length
        );
        break;
    }

    this.player.hand = sortedCards;
    this.render();
  }

  /**
   * Update for mobile display
   */
  updateForMobile() {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.handElement.classList.add("mobile-hand");
      // Smaller cards on mobile
      for (const cardElement of this.cardElements) {
        cardElement.classList.add("mobile-card");
      }
    } else {
      this.handElement.classList.remove("mobile-hand");
      for (const cardElement of this.cardElements) {
        cardElement.classList.remove("mobile-card");
      }
    }
  }

  /**
   * Validate renderer state
   * @returns {boolean} True if valid
   */
  validate() {
    if (!this.handElement) {
      console.error("HandRenderer: Missing hand element");
      return false;
    }

    if (!this.player) {
      console.error("HandRenderer: Missing player reference");
      return false;
    }

    return true;
  }

  /**
   * Clean up renderer
   */
  destroy() {
    // Clear all highlights and tooltips
    this.clearHighlights();
    this.hideCardTooltip();

    // Clear hover states
    for (const element of this.hoveredElements) {
      element.classList.remove("hover");
    }
    this.hoveredElements.clear();

    // Clear selection
    this.selectedCardElement = null;

    if (DEBUG.ENABLED) {
      console.log("HandRenderer destroyed");
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = HandRenderer;
}

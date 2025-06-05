/**
 * Bluff Battle - Grid System
 * Manages the game grid, positioning, and spatial relationships
 */

class GridSystem {
  constructor(
    width = GAME_CONFIG.GRID_WIDTH,
    height = GAME_CONFIG.GRID_HEIGHT
  ) {
    this.width = width;
    this.height = height;
    this.totalPositions = width * height;
    this.grid = new Array(this.totalPositions).fill(null);
    this.positionStates = new Array(this.totalPositions).fill(
      POSITION_STATES.EMPTY
    );

    // Track grid changes for efficient updates
    this.lastModified = Date.now();
    this.changeHistory = [];

    if (DEBUG.ENABLED) {
      console.log(
        `GridSystem initialized: ${width}x${height} (${this.totalPositions} positions)`
      );
    }
  }

  /**
   * Convert 2D coordinates to 1D position
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @returns {number} 1D position index
   */
  coordsToPosition(row, col) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
      throw new Error(`Invalid coordinates: (${row}, ${col})`);
    }
    return row * this.width + col;
  }

  /**
   * Convert 1D position to 2D coordinates
   * @param {number} position - 1D position index
   * @returns {Object} {row, col} coordinates
   */
  positionToCoords(position) {
    if (position < 0 || position >= this.totalPositions) {
      throw new Error(`Invalid position: ${position}`);
    }
    return {
      row: Math.floor(position / this.width),
      col: position % this.width,
    };
  }

  /**
   * Check if a position is valid and empty
   * @param {number} position - Position to check
   * @returns {boolean} True if position is valid and empty
   */
  isPositionAvailable(position) {
    return (
      position >= 0 &&
      position < this.totalPositions &&
      this.grid[position] === null
    );
  }

  /**
   * Check if a position is occupied
   * @param {number} position - Position to check
   * @returns {boolean} True if position is occupied
   */
  isPositionOccupied(position) {
    return (
      position >= 0 &&
      position < this.totalPositions &&
      this.grid[position] !== null
    );
  }

  /**
   * Place a card at a specific position
   * @param {Card} card - Card to place
   * @param {number} position - Position to place the card
   * @returns {boolean} True if placement was successful
   */
  placeCard(card, position) {
    if (!(card instanceof Card)) {
      throw new Error("Invalid card instance");
    }

    if (!this.isPositionAvailable(position)) {
      throw new Error(`Position ${position} is not available`);
    }

    // Place the card
    this.grid[position] = card;
    this.positionStates[position] = POSITION_STATES.OCCUPIED;
    card.place(position);

    // Record the change
    this.recordChange("place", position, card);

    if (DEBUG.ENABLED) {
      console.log(`Card placed at position ${position}: ${card.toString()}`);
    }

    eventBus.emit(EVENTS.UI_UPDATE, {
      action: "card_placed",
      card: card,
      position: position,
      grid: this,
    });

    return true;
  }

  /**
   * Remove a card from a position
   * @param {number} position - Position to clear
   * @returns {Card|null} Removed card or null if position was empty
   */
  removeCard(position) {
    if (position < 0 || position >= this.totalPositions) {
      throw new Error(`Invalid position: ${position}`);
    }

    const card = this.grid[position];
    if (card) {
      this.grid[position] = null;
      this.positionStates[position] = POSITION_STATES.EMPTY;

      // Record the change
      this.recordChange("remove", position, card);

      if (DEBUG.ENABLED) {
        console.log(
          `Card removed from position ${position}: ${card.toString()}`
        );
      }

      eventBus.emit(EVENTS.UI_UPDATE, {
        action: "card_removed",
        card: card,
        position: position,
        grid: this,
      });
    }

    return card;
  }

  /**
   * Get the card at a specific position
   * @param {number} position - Position to check
   * @returns {Card|null} Card at position or null if empty
   */
  getCardAt(position) {
    if (position < 0 || position >= this.totalPositions) {
      return null;
    }
    return this.grid[position];
  }

  /**
   * Get all cards currently on the grid
   * @returns {Array<Object>} Array of {card, position} objects
   */
  getAllCards() {
    const cards = [];
    for (let i = 0; i < this.totalPositions; i++) {
      if (this.grid[i] !== null) {
        cards.push({
          card: this.grid[i],
          position: i,
        });
      }
    }
    return cards;
  }

  /**
   * Get all empty positions
   * @returns {Array<number>} Array of empty position indices
   */
  getEmptyPositions() {
    const empty = [];
    for (let i = 0; i < this.totalPositions; i++) {
      if (this.grid[i] === null) {
        empty.push(i);
      }
    }
    return empty;
  }

  /**
   * Get cards owned by a specific player
   * @param {Player} player - Player to find cards for
   * @returns {Array<Object>} Array of {card, position} objects
   */
  getPlayerCards(player) {
    return this.getAllCards().filter((entry) => entry.card.owner === player);
  }

  /**
   * Get adjacent positions to a given position
   * @param {number} position - Center position
   * @param {boolean} includeAdjoining - Include diagonal adjacencies
   * @returns {Array<number>} Array of adjacent position indices
   */
  getAdjacentPositions(position, includeAdjoining = false) {
    if (position < 0 || position >= this.totalPositions) {
      return [];
    }

    const coords = this.positionToCoords(position);
    const adjacent = [];

    // Define direction vectors
    const directions = includeAdjoining
      ? [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ] // 8-directional
      : [
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, 0],
        ]; // 4-directional

    for (const [dRow, dCol] of directions) {
      const newRow = coords.row + dRow;
      const newCol = coords.col + dCol;

      if (
        newRow >= 0 &&
        newRow < this.height &&
        newCol >= 0 &&
        newCol < this.width
      ) {
        adjacent.push(this.coordsToPosition(newRow, newCol));
      }
    }

    return adjacent;
  }

  /**
   * Get horizontal neighbors (for battle resolution)
   * @param {number} position - Position to check
   * @returns {Object} {left, right} positions or null if at edge
   */
  getHorizontalNeighbors(position) {
    const coords = this.positionToCoords(position);
    const neighbors = { left: null, right: null };

    if (coords.col > 0) {
      neighbors.left = this.coordsToPosition(coords.row, coords.col - 1);
    }
    if (coords.col < this.width - 1) {
      neighbors.right = this.coordsToPosition(coords.row, coords.col + 1);
    }

    return neighbors;
  }

  /**
   * Get vertical neighbors
   * @param {number} position - Position to check
   * @returns {Object} {up, down} positions or null if at edge
   */
  getVerticalNeighbors(position) {
    const coords = this.positionToCoords(position);
    const neighbors = { up: null, down: null };

    if (coords.row > 0) {
      neighbors.up = this.coordsToPosition(coords.row - 1, coords.col);
    }
    if (coords.row < this.height - 1) {
      neighbors.down = this.coordsToPosition(coords.row + 1, coords.col);
    }

    return neighbors;
  }

  /**
   * Find optimal positions for card placement
   * @param {Player} player - Player looking for positions
   * @param {Card} card - Card to be placed
   * @returns {Array<Object>} Sorted array of position recommendations
   */
  getRecommendedPositions(player, card) {
    const emptyPositions = this.getEmptyPositions();
    const recommendations = [];

    for (const position of emptyPositions) {
      const score = this.evaluatePosition(position, player, card);
      recommendations.push({
        position,
        score,
        reasoning: this.getPositionReasoning(position, player, card),
      });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluate the strategic value of a position
   * @param {number} position - Position to evaluate
   * @param {Player} player - Player considering the position
   * @param {Card} card - Card to be placed
   * @returns {number} Strategic value score
   */
  evaluatePosition(position, player, card) {
    let score = 0;

    // Check adjacent friendly cards (control bonus)
    const adjacent = this.getAdjacentPositions(position);
    for (const adjPos of adjacent) {
      const adjCard = this.getCardAt(adjPos);
      if (adjCard && adjCard.owner === player) {
        score += 2; // Friendly adjacency bonus
      }
    }

    // Check potential battles
    const neighbors = this.getHorizontalNeighbors(position);

    if (neighbors.left !== null) {
      const leftCard = this.getCardAt(neighbors.left);
      if (leftCard && leftCard.owner !== player) {
        // Potential battle to the left
        if (card.canDefeat(leftCard.type)) {
          score += 3; // Can defeat opponent
        } else {
          score -= 1; // Will likely lose
        }
      }
    }

    if (neighbors.right !== null) {
      const rightCard = this.getCardAt(neighbors.right);
      if (rightCard && rightCard.owner !== player) {
        // Potential battle to the right
        if (card.canDefeat(rightCard.type)) {
          score += 3; // Can defeat opponent
        } else {
          score -= 1; // Will likely lose
        }
      }
    }

    // Positional preferences (center is generally better)
    const coords = this.positionToCoords(position);
    const centerCol = Math.floor(this.width / 2);
    const centerRow = Math.floor(this.height / 2);
    const distanceFromCenter =
      Math.abs(coords.col - centerCol) + Math.abs(coords.row - centerRow);
    score += (this.width + this.height - distanceFromCenter) * 0.5;

    return score;
  }

  /**
   * Get reasoning for position recommendation
   * @param {number} position - Position being evaluated
   * @param {Player} player - Player considering the position
   * @param {Card} card - Card to be placed
   * @returns {string} Human-readable reasoning
   */
  getPositionReasoning(position, player, card) {
    const reasons = [];
    const adjacent = this.getAdjacentPositions(position);
    const neighbors = this.getHorizontalNeighbors(position);

    // Check for friendly support
    const friendlyAdjacent = adjacent.filter((pos) => {
      const adjCard = this.getCardAt(pos);
      return adjCard && adjCard.owner === player;
    }).length;

    if (friendlyAdjacent > 0) {
      reasons.push(`${friendlyAdjacent} friendly cards nearby`);
    }

    // Check battle potential
    if (neighbors.left !== null) {
      const leftCard = this.getCardAt(neighbors.left);
      if (
        leftCard &&
        leftCard.owner !== player &&
        card.canDefeat(leftCard.type)
      ) {
        reasons.push("can defeat left opponent");
      }
    }

    if (neighbors.right !== null) {
      const rightCard = this.getCardAt(neighbors.right);
      if (
        rightCard &&
        rightCard.owner !== player &&
        card.canDefeat(rightCard.type)
      ) {
        reasons.push("can defeat right opponent");
      }
    }

    const coords = this.positionToCoords(position);
    if (coords.col === Math.floor(this.width / 2)) {
      reasons.push("central column");
    }

    return reasons.length > 0 ? reasons.join(", ") : "safe position";
  }

  /**
   * Get battle pairs for sequential resolution
   * @returns {Array<Object>} Array of battle pair objects
   */
  getBattlePairs() {
    const battles = [];

    // Process positions sequentially for battles
    for (let position = 0; position < this.totalPositions - 1; position++) {
      const currentCard = this.getCardAt(position);
      const nextCard = this.getCardAt(position + 1);

      // Check if this is a valid horizontal battle
      const currentCoords = this.positionToCoords(position);
      const nextCoords = this.positionToCoords(position + 1);

      if (
        currentCard &&
        nextCard &&
        currentCoords.row === nextCoords.row &&
        nextCoords.col === currentCoords.col + 1
      ) {
        battles.push({
          position1: position,
          card1: currentCard,
          position2: position + 1,
          card2: nextCard,
          type: "horizontal",
        });
      }
    }

    return battles;
  }

  /**
   * Record a change to the grid for history tracking
   * @param {string} action - Type of change ('place', 'remove', 'battle')
   * @param {number} position - Position affected
   * @param {Card} card - Card involved
   * @param {Object} metadata - Additional change data
   */
  recordChange(action, position, card, metadata = {}) {
    const change = {
      action,
      position,
      cardId: card ? card.id : null,
      timestamp: Date.now(),
      ...metadata,
    };

    this.changeHistory.push(change);
    this.lastModified = Date.now();

    // Keep history manageable
    if (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }
  }

  /**
   * Get grid statistics
   * @returns {Object} Grid statistics
   */
  getStatistics() {
    const occupied = this.grid.filter((cell) => cell !== null).length;
    const playerCards = {};

    for (const cell of this.grid) {
      if (cell && cell.owner) {
        const playerId = cell.owner.id;
        playerCards[playerId] = (playerCards[playerId] || 0) + 1;
      }
    }

    return {
      totalPositions: this.totalPositions,
      occupiedPositions: occupied,
      emptyPositions: this.totalPositions - occupied,
      occupancyRate: occupied / this.totalPositions,
      playerCards,
      lastModified: this.lastModified,
      totalChanges: this.changeHistory.length,
    };
  }

  /**
   * Set position state for UI updates
   * @param {number} position - Position to update
   * @param {string} state - New state
   */
  setPositionState(position, state) {
    if (position >= 0 && position < this.totalPositions) {
      this.positionStates[position] = state;
    }
  }

  /**
   * Get position state
   * @param {number} position - Position to check
   * @returns {string} Position state
   */
  getPositionState(position) {
    return position >= 0 && position < this.totalPositions
      ? this.positionStates[position]
      : POSITION_STATES.EMPTY;
  }

  /**
   * Clear all position states to empty
   */
  clearAllStates() {
    this.positionStates.fill(POSITION_STATES.EMPTY);
    for (let i = 0; i < this.totalPositions; i++) {
      if (this.grid[i] !== null) {
        this.positionStates[i] = POSITION_STATES.OCCUPIED;
      }
    }
  }

  /**
   * Clear the entire grid
   */
  clear() {
    this.grid.fill(null);
    this.positionStates.fill(POSITION_STATES.EMPTY);
    this.changeHistory = [];
    this.lastModified = Date.now();

    if (DEBUG.ENABLED) {
      console.log("Grid cleared");
    }

    eventBus.emit(EVENTS.UI_UPDATE, {
      type: "grid_cleared",
      grid: this,
    });
  }

  /**
   * Create a visual representation of the grid for debugging
   * @returns {string} ASCII representation of the grid
   */
  toAscii() {
    let result = "\n Grid Layout:\n";
    result +=
      "  " +
      Array.from({ length: this.width }, (_, i) =>
        i.toString().padStart(2)
      ).join(" ") +
      "\n";

    for (let row = 0; row < this.height; row++) {
      result += row + " ";
      for (let col = 0; col < this.width; col++) {
        const position = this.coordsToPosition(row, col);
        const card = this.getCardAt(position);

        if (card) {
          const owner = card.owner
            ? card.owner.type === PLAYER_TYPES.HUMAN
              ? "H"
              : "A"
            : "?";
          const type = card.type[0].toUpperCase(); // R, P, S
          result += `${owner}${type}`;
        } else {
          result += "  ";
        }
        result += " ";
      }
      result += "\n";
    }

    return result;
  }

  /**
   * Get grid layout as 2D array for easier processing
   * @returns {Array<Array>} 2D array representation
   */
  to2DArray() {
    const array2D = [];
    for (let row = 0; row < this.height; row++) {
      const rowArray = [];
      for (let col = 0; col < this.width; col++) {
        const position = this.coordsToPosition(row, col);
        rowArray.push(this.getCardAt(position));
      }
      array2D.push(rowArray);
    }
    return array2D;
  }

  /**
   * Find paths between positions (for advanced AI)
   * @param {number} start - Starting position
   * @param {number} end - Ending position
   * @param {boolean} allowOccupied - Whether to path through occupied positions
   * @returns {Array<number>} Array of positions forming a path, or empty if no path
   */
  findPath(start, end, allowOccupied = false) {
    // Validate input parameters
    if (
      start < 0 ||
      start >= this.totalPositions ||
      end < 0 ||
      end >= this.totalPositions
    ) {
      return [];
    }

    if (start === end) return [start];

    const visited = new Set();
    const queue = [{ position: start, path: [start] }];

    while (queue.length > 0) {
      const { position, path } = queue.shift();

      if (position === end) {
        return path;
      }

      if (visited.has(position)) continue;
      visited.add(position);

      const adjacent = this.getAdjacentPositions(position);
      for (const adjPos of adjacent) {
        if (
          !visited.has(adjPos) &&
          (allowOccupied || this.isPositionAvailable(adjPos))
        ) {
          queue.push({
            position: adjPos,
            path: [...path, adjPos],
          });
        }
      }
    }

    return []; // No path found
  }

  /**
   * Calculate Manhattan distance between positions
   * @param {number} pos1 - First position
   * @param {number} pos2 - Second position
   * @returns {number} Manhattan distance
   */
  getDistance(pos1, pos2) {
    const coords1 = this.positionToCoords(pos1);
    const coords2 = this.positionToCoords(pos2);

    return (
      Math.abs(coords1.row - coords2.row) + Math.abs(coords1.col - coords2.col)
    );
  }

  /**
   * Get all positions in a specific row
   * @param {number} row - Row index
   * @returns {Array<number>} Positions in the row
   */
  getRowPositions(row) {
    if (row < 0 || row >= this.height) return [];

    const positions = [];
    for (let col = 0; col < this.width; col++) {
      positions.push(this.coordsToPosition(row, col));
    }
    return positions;
  }

  /**
   * Get all positions in a specific column
   * @param {number} col - Column index
   * @returns {Array<number>} Positions in the column
   */
  getColumnPositions(col) {
    if (col < 0 || col >= this.width) return [];

    const positions = [];
    for (let row = 0; row < this.height; row++) {
      positions.push(this.coordsToPosition(row, col));
    }
    return positions;
  }

  /**
   * Check if a position is on the edge of the grid
   * @param {number} position - Position to check
   * @returns {Object} {isEdge, edges} - isEdge boolean and array of edge types
   */
  isEdgePosition(position) {
    const coords = this.positionToCoords(position);
    const edges = [];

    if (coords.row === 0) edges.push("top");
    if (coords.row === this.height - 1) edges.push("bottom");
    if (coords.col === 0) edges.push("left");
    if (coords.col === this.width - 1) edges.push("right");

    return {
      isEdge: edges.length > 0,
      edges: edges,
    };
  }

  /**
   * Get center positions (useful for strategic placement)
   * @returns {Array<number>} Positions near the center
   */
  getCenterPositions() {
    const centerRow = Math.floor(this.height / 2);
    const centerCol = Math.floor(this.width / 2);
    const centerPositions = [];

    // Add exact center and immediate neighbors
    for (
      let row = Math.max(0, centerRow - 1);
      row <= Math.min(this.height - 1, centerRow + 1);
      row++
    ) {
      for (
        let col = Math.max(0, centerCol - 1);
        col <= Math.min(this.width - 1, centerCol + 1);
        col++
      ) {
        centerPositions.push(this.coordsToPosition(row, col));
      }
    }

    return centerPositions;
  }

  /**
   * Clone the grid state for simulation purposes
   * @returns {GridSystem} Cloned grid system
   */
  clone() {
    const clonedGrid = new GridSystem(this.width, this.height);

    for (let i = 0; i < this.totalPositions; i++) {
      if (this.grid[i] !== null) {
        // Clone the card as well
        const clonedCard = this.grid[i].clone();
        clonedGrid.grid[i] = clonedCard;
        clonedGrid.positionStates[i] = this.positionStates[i];
      }
    }

    return clonedGrid;
  }

  /**
   * Serialize grid data for saving
   * @returns {Object} Serialized grid data
   */
  serialize() {
    const gridData = [];

    for (let i = 0; i < this.totalPositions; i++) {
      if (this.grid[i] !== null) {
        gridData.push({
          position: i,
          card: this.grid[i].serialize(),
        });
      }
    }

    return {
      width: this.width,
      height: this.height,
      gridData: gridData,
      positionStates: [...this.positionStates],
      lastModified: this.lastModified,
      changeHistory: this.changeHistory.slice(-20), // Keep only recent changes
    };
  }

  /**
   * Restore grid from serialized data
   * @param {Object} data - Serialized grid data
   * @param {Map} playerMap - Map of player IDs to player instances
   */
  static deserialize(data, playerMap = new Map()) {
    const grid = new GridSystem(data.width, data.height);

    for (const entry of data.gridData) {
      const card = Card.deserialize(entry.card);

      // Restore card owner reference
      if (entry.card.owner) {
        card.owner = playerMap.get(entry.card.owner);
      }

      grid.grid[entry.position] = card;
    }

    grid.positionStates = [...data.positionStates];
    grid.lastModified = data.lastModified;
    grid.changeHistory = data.changeHistory || [];

    return grid;
  }

  /**
   * Validate grid state
   * @returns {boolean} True if grid state is valid
   */
  validate() {
    // Check grid dimensions
    if (this.width <= 0 || this.height <= 0) {
      console.error("Invalid grid dimensions");
      return false;
    }

    if (this.grid.length !== this.totalPositions) {
      console.error("Grid array size mismatch");
      return false;
    }

    // Check all cards
    for (let i = 0; i < this.totalPositions; i++) {
      const card = this.grid[i];
      if (card !== null) {
        if (!(card instanceof Card) || !card.validate()) {
          console.error(`Invalid card at position ${i}`);
          return false;
        }

        if (card.position !== i) {
          console.error(
            `Card position mismatch at ${i}: card thinks it's at ${card.position}`
          );
          return false;
        }
      }
    }

    // Check position states consistency
    for (let i = 0; i < this.totalPositions; i++) {
      const hasCard = this.grid[i] !== null;
      const stateOccupied = this.positionStates[i] === POSITION_STATES.OCCUPIED;

      if (hasCard !== stateOccupied) {
        console.error(`Position state inconsistency at ${i}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get detailed grid information for debugging
   * @returns {Object} Detailed grid information
   */
  getDebugInfo() {
    return {
      dimensions: `${this.width}x${this.height}`,
      totalPositions: this.totalPositions,
      occupiedCount: this.grid.filter((cell) => cell !== null).length,
      lastModified: new Date(this.lastModified).toLocaleString(),
      changeCount: this.changeHistory.length,
      recentChanges: this.changeHistory.slice(-5),
      positionStates: this.positionStates.reduce((acc, state, index) => {
        acc[index] = state;
        return acc;
      }, {}),
      ascii: this.toAscii(),
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GridSystem;
}

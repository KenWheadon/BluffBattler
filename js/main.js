/**
 * Bluff Battle - Main Application Bootstrap
 * Initializes and starts the game application
 */

// Global application state
let game = null;
let uiManager = null;

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    console.log("Initializing Bluff Battle...");

    // Show loading screen
    showLoadingScreen();

    // Initialize core systems
    await initializeCore();

    // Initialize UI
    await initializeUI();

    // Setup global event handlers
    setupGlobalHandlers();

    // Hide loading screen
    hideLoadingScreen();

    // Show welcome message
    showWelcomeMessage();

    console.log("Bluff Battle initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    showErrorMessage("Failed to initialize game. Please refresh the page.");
  }
}

/**
 * Initialize core game systems
 */
async function initializeCore() {
  try {
    // Create game instance
    game = new Game();

    // Initialize UI Manager
    uiManager = new UIManager(game);
    await uiManager.initialize();

    // Make instances globally available for debugging
    if (DEBUG.ENABLED) {
      window.game = game;
      window.uiManager = uiManager;
      window.inputHandler = uiManager.inputHandler;
      window.modalManager = uiManager.modalManager;
      window.eventBus = eventBus;
      window.cardFactory = cardFactory;
      console.log("Debug objects attached to window");
    }
  } catch (error) {
    console.error("Core initialization failed:", error);
    throw error;
  }
}

/**
 * Initialize user interface
 */
async function initializeUI() {
  try {
    // Validate UI state
    if (!uiManager.validate()) {
      throw new Error("UI validation failed");
    }

    // Add welcome buttons
    addWelcomeButtons();

    // Setup keyboard shortcuts help
    setupKeyboardShortcuts();

    if (DEBUG.ENABLED) {
      console.log("UI initialized successfully");
    }
  } catch (error) {
    console.error("UI initialization failed:", error);
    throw error;
  }
}

/**
 * Add welcome buttons to start the game
 */
function addWelcomeButtons() {
  const gameStatus = document.getElementById("game-status");
  if (!gameStatus) return;

  // Create welcome content
  const welcomeContent = document.createElement("div");
  welcomeContent.className = "welcome-content";
  welcomeContent.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Bluff Battle!</h2>
            <p>Ready to test your strategic deception skills?</p>
            <div class="welcome-buttons">
                <button id="start-game-btn" class="primary-btn">Start New Game</button>
                <button id="how-to-play-btn" class="secondary-btn">How to Play</button>
            </div>
        </div>
    `;

  gameStatus.appendChild(welcomeContent);

  // Add event listeners
  const startGameBtn = document.getElementById("start-game-btn");
  const howToPlayBtn = document.getElementById("how-to-play-btn");

  if (startGameBtn) {
    startGameBtn.addEventListener("click", startNewGame);
  }

  if (howToPlayBtn) {
    howToPlayBtn.addEventListener("click", showHowToPlay);
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    // Don't handle shortcuts when typing in inputs
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case "n":
        event.preventDefault();
        startNewGame();
        break;
      case "h":
        event.preventDefault();
        showHowToPlay();
        break;
      case "r":
        if (event.ctrlKey) {
          event.preventDefault();
          location.reload();
        }
        break;
      case "1":
        event.preventDefault();
        selectClaimType(CARD_TYPES.ROCK);
        break;
      case "2":
        event.preventDefault();
        selectClaimType(CARD_TYPES.PAPER);
        break;
      case "3":
        event.preventDefault();
        selectClaimType(CARD_TYPES.SCISSORS);
        break;
    }
  });
}

/**
 * Setup global event handlers
 */
function setupGlobalHandlers() {
  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game && game.isGameActive) {
      game.pauseGame();
    }
  });

  // Handle window resize
  window.addEventListener("resize", debounce(handleResize, 250));

  // Handle beforeunload for game saves
  window.addEventListener("beforeunload", (event) => {
    if (game && game.isGameActive && !game.isPaused) {
      event.preventDefault();
      event.returnValue =
        "You have a game in progress. Are you sure you want to leave?";
    }
  });

  // Handle errors
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
    if (uiManager) {
      uiManager.addLogMessage("An unexpected error occurred.", "error");
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    if (uiManager) {
      uiManager.addLogMessage("An unexpected error occurred.", "error");
    }
  });
}

/**
 * Start a new game
 */
async function startNewGame() {
  try {
    if (!game || !uiManager) {
      throw new Error("Game systems not initialized");
    }

    // Clear welcome content
    clearWelcomeContent();

    // Start the game through UI manager
    await uiManager.startNewGame();
  } catch (error) {
    console.error("Failed to start new game:", error);
    showErrorMessage("Failed to start new game. Please try again.");
  }
}

/**
 * Select claim type via keyboard shortcut
 * @param {string} claimType - Type to select
 */
function selectClaimType(claimType) {
  if (uiManager && typeof uiManager.handleClaimSelection === "function") {
    uiManager.handleClaimSelection(claimType);
  } else {
    console.warn("UIManager not available or method not found");
  }
}

/**
 * Show how to play modal
 */
function showHowToPlay() {
  if (!uiManager) {
    console.warn("UIManager not available");
    return;
  }

  const content = `
        <div class="how-to-play">
            <h3>How to Play Bluff Battle</h3>
            
            <div class="rule-section">
                <h4>🎯 Objective</h4>
                <p>Be the first player to reach <strong>10 points</strong> with at least a <strong>1-point lead</strong>.</p>
            </div>
            
            <div class="rule-section">
                <h4>🃏 Cards</h4>
                <p><strong>🪨 Rock</strong> defeats Scissors</p>
                <p><strong>📄 Paper</strong> defeats Rock</p>
                <p><strong>✂️ Scissors</strong> defeats Paper</p>
            </div>
            
            <div class="rule-section">
                <h4>🎮 Gameplay</h4>
                <ol>
                    <li><strong>Placement:</strong> Take turns placing cards on the 5×3 grid</li>
                    <li><strong>Claims:</strong> When placing a card, claim what type it is (you can lie!)</li>
                    <li><strong>Challenges:</strong> Challenge your opponent's claims if you think they're bluffing</li>
                    <li><strong>Battles:</strong> After all cards are placed, adjacent cards battle automatically</li>
                    <li><strong>Scoring:</strong> Earn points for winning battles, advancing, and controlling territory</li>
                </ol>
            </div>
            
            <div class="rule-section">
                <h4>⚔️ Battle Resolution</h4>
                <p>Cards battle based on their <em>actual</em> types (not claimed types). Winners advance and earn points.</p>
            </div>
            
            <div class="rule-section">
                <h4>🎭 Bluffing & Challenges</h4>
                <ul>
                    <li><strong>Successful Challenge:</strong> Opponent was bluffing - they get caught!</li>
                    <li><strong>Failed Challenge:</strong> Opponent was truthful - you lose a point!</li>
                    <li><strong>Timing:</strong> You have 5 seconds to challenge after opponent's play</li>
                </ul>
            </div>
            
            <div class="rule-section">
                <h4>⌨️ Keyboard Shortcuts</h4>
                <ul>
                    <li><strong>N:</strong> New Game</li>
                    <li><strong>H:</strong> How to Play</li>
                    <li><strong>P:</strong> Pause/Resume</li>
                    <li><strong>1-3:</strong> Select Rock/Paper/Scissors claim</li>
                    <li><strong>Space:</strong> Challenge opponent</li>
                    <li><strong>Enter:</strong> Confirm play</li>
                    <li><strong>Escape:</strong> Cancel/Close</li>
                </ul>
            </div>
            
            <div class="rule-section">
                <h4>💡 Strategy Tips</h4>
                <ul>
                    <li>Bluff sparingly - too many lies become predictable</li>
                    <li>Pay attention to your opponent's patterns</li>
                    <li>Control the center of the grid for maximum flexibility</li>
                    <li>Challenge when you're confident, but beware the penalty!</li>
                </ul>
            </div>
        </div>
    `;

  uiManager.showModal("How to Play", content);
}

/**
 * Clear welcome content
 */
function clearWelcomeContent() {
  const welcomeContent = document.querySelector(".welcome-content");
  if (welcomeContent) {
    welcomeContent.remove();
  }
}

/**
 * Show welcome message
 */
function showWelcomeMessage() {
  if (uiManager) {
    uiManager.addLogMessage(
      'Welcome to Bluff Battle! Click "Start New Game" to begin.',
      "highlight"
    );
  }
}

/**
 * Show loading screen
 */
function showLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.remove("hidden");
  }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" class="primary-btn">Refresh Page</button>
    `;

  // Insert at top of game container
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.insertBefore(errorDiv, gameContainer.firstChild);
  }
}

/**
 * Handle window resize
 */
function handleResize() {
  // Update UI for new dimensions
  if (uiManager && typeof uiManager.updateUI === "function") {
    uiManager.updateUI();
  }

  // Adjust grid size on mobile if needed
  updateGridForScreenSize();
}

/**
 * Update grid layout for screen size
 */
function updateGridForScreenSize() {
  const gameGrid = document.getElementById("game-grid");
  if (!gameGrid) return;

  const screenWidth = window.innerWidth;

  if (screenWidth < 768) {
    gameGrid.classList.add("mobile-grid");
  } else {
    gameGrid.classList.remove("mobile-grid");
  }
}

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check browser compatibility
 * @returns {boolean} True if browser is compatible
 */
function checkBrowserCompatibility() {
  // Check for required features
  const requiredFeatures = [
    "localStorage" in window,
    "addEventListener" in document,
    "querySelector" in document,
    "classList" in document.createElement("div"),
    "JSON" in window,
    "setTimeout" in window,
  ];

  return requiredFeatures.every((feature) => feature);
}

/**
 * Show browser compatibility warning
 */
function showBrowserWarning() {
  const warningDiv = document.createElement("div");
  warningDiv.className = "browser-warning";
  warningDiv.innerHTML = `
        <h3>Browser Compatibility Warning</h3>
        <p>Your browser may not support all features of Bluff Battle. Please consider updating to a modern browser for the best experience.</p>
        <button onclick="this.parentElement.remove()" class="secondary-btn">Continue Anyway</button>
    `;

  document.body.insertBefore(warningDiv, document.body.firstChild);
}

/**
 * Application entry point
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check browser compatibility
    if (!checkBrowserCompatibility()) {
      showBrowserWarning();
    }

    // Initialize the application
    await initializeApp();

    // Update grid for initial screen size
    updateGridForScreenSize();

    if (DEBUG.ENABLED) {
      console.log("Application startup complete");
      console.log("Available debug commands:");
      console.log("- game: Game instance");
      console.log("- uiManager: UI Manager instance");
      console.log("- eventBus: Event system");
      console.log("- cardFactory: Card factory");
    }
  } catch (error) {
    console.error("Application startup failed:", error);
    showErrorMessage("Failed to start Bluff Battle. Please refresh the page.");
  }
});

// Global functions for HTML onclick handlers
window.startNewGame = startNewGame;
window.showHowToPlay = showHowToPlay;

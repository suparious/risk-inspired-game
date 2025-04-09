/**
 * Game engine for Risk-inspired strategy game
 */

import { GameState, Territory, Continent, Player, Card } from './models.js';

/**
 * Handles core game logic and state transitions
 */
class GameEngine {
  /**
   * Create a new GameEngine
   * @param {Object} config - Game configuration options
   */
  constructor(config = {}) {
    this.config = {
      mapId: 'classic',
      playerCount: 4,
      aiPlayers: 3,
      enableTechnologies: true,
      enableResources: true,
      enableEvents: true,
      enableAlliances: true,
      victoryConditions: ['military', 'economic', 'technological'],
      ...config
    };
    
    this.gameState = null;
    this.mapData = null;
  }

  /**
   * Initialize a new game
   * @returns {GameState} The initial game state
   */
  initializeGame() {
    // Load map data
    this.mapData = this.loadMapData(this.config.mapId);
    
    // Create players
    const players = this.createPlayers();
    
    // Create territories
    const territories = this.createTerritories();
    
    // Create continents
    const continents = this.createContinents();
    
    // Create card deck
    const cardDeck = this.createCardDeck(territories);
    
    // Create initial game state
    this.gameState = new GameState(this.config, players, territories, continents, cardDeck);
    
    // Distribute territories and initial armies
    this.distributeInitialTerritories();
    this.placeInitialArmies();
    
    return this.gameState;
  }

  /**
   * Load map data based on map ID
   * @param {string} mapId - ID of the map to load
   * @returns {Object} Map data
   */
  loadMapData(mapId) {
    // TODO: Implement map loading from JSON files
    // For now, return a placeholder
    return {
      name: 'Classic World Map',
      territories: [],
      continents: []
    };
  }

  /**
   * Create player objects
   * @returns {Player[]} Array of player objects
   */
  createPlayers() {
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'purple'];
    const players = [];
    
    // Create human player
    players.push(new Player('p1', 'Player 1', colors[0]));
    
    // Create AI players
    for (let i = 0; i < this.config.aiPlayers; i++) {
      players.push(new Player(`ai${i+1}`, `AI Player ${i+1}`, colors[i+1]));
    }
    
    return players;
  }

  /**
   * Create territory objects based on map data
   * @returns {Territory[]} Array of territory objects
   */
  createTerritories() {
    // TODO: Implement territory creation from map data
    // For now, return a placeholder with some sample territories
    const territories = [
      new Territory('t1', 'Territory 1', ['t2', 't3'], 'c1'),
      new Territory('t2', 'Territory 2', ['t1', 't3'], 'c1'),
      new Territory('t3', 'Territory 3', ['t1', 't2', 't4'], 'c2'),
      new Territory('t4', 'Territory 4', ['t3'], 'c2')
    ];
    
    return territories;
  }

  /**
   * Create continent objects based on map data
   * @returns {Continent[]} Array of continent objects
   */
  createContinents() {
    // TODO: Implement continent creation from map data
    // For now, return a placeholder with sample continents
    const continents = [
      new Continent('c1', 'Continent 1', ['t1', 't2'], 2),
      new Continent('c2', 'Continent 2', ['t3', 't4'], 1)
    ];
    
    return continents;
  }

  /**
   * Create the deck of territory cards
   * @param {Territory[]} territories - List of territories
   * @returns {Card[]} Deck of cards
   */
  createCardDeck(territories) {
    const cards = [];
    const types = ['infantry', 'cavalry', 'artillery'];
    
    // Create territory cards
    territories.forEach((territory, index) => {
      const type = types[index % 3];
      cards.push(new Card(`card-${territory.id}`, type, territory.id));
    });
    
    // Add wild cards
    cards.push(new Card('wild-1', 'wild'));
    cards.push(new Card('wild-2', 'wild'));
    
    // Shuffle the deck
    return this.shuffleArray([...cards]);
  }

  /**
   * Randomly distribute territories among players
   */
  distributeInitialTerritories() {
    // Create a copy of the territories array
    const territories = [...this.gameState.territories];
    
    // Shuffle the territories
    this.shuffleArray(territories);
    
    // Distribute territories evenly among players
    const players = this.gameState.players;
    territories.forEach((territory, index) => {
      const playerIndex = index % players.length;
      const player = players[playerIndex];
      
      // Update territory
      territory.occupyingPlayer = player.id;
      territory.armies.infantry = 1;
      
      // Update player
      player.territories.push(territory.id);
    });
  }

  /**
   * Place initial armies on territories
   */
  placeInitialArmies() {
    // Calculate initial armies per player
    const playerCount = this.gameState.players.length;
    let armiesPerPlayer;
    
    switch (playerCount) {
      case 2:
        armiesPerPlayer = 40;
        break;
      case 3:
        armiesPerPlayer = 35;
        break;
      case 4:
        armiesPerPlayer = 30;
        break;
      case 5:
        armiesPerPlayer = 25;
        break;
      case 6:
        armiesPerPlayer = 20;
        break;
      default:
        armiesPerPlayer = 30;
    }
    
    // Subtract the armies already placed during territory distribution
    armiesPerPlayer -= this.gameState.players[0].territories.length;
    
    // Assign remaining armies to each player
    // (in a real implementation, this would be done interactively)
    for (const player of this.gameState.players) {
      let remainingArmies = armiesPerPlayer;
      
      // Distribute armies evenly across player's territories
      const territoriesPerPlayer = player.territories.length;
      const baseArmiesPerTerritory = Math.floor(remainingArmies / territoriesPerPlayer);
      let extraArmies = remainingArmies % territoriesPerPlayer;
      
      for (const territoryId of player.territories) {
        const territory = this.gameState.territories.find(t => t.id === territoryId);
        const extraForThisTerritory = extraArmies > 0 ? 1 : 0;
        
        territory.armies.infantry += baseArmiesPerTerritory + extraForThisTerritory;
        extraArmies--;
      }
    }
  }

  /**
   * Process a player's reinforcement phase
   * @param {string} playerId - ID of the player
   * @param {Object} reinforcements - Map of territory IDs to army counts
   * @returns {boolean} True if successful
   */
  processReinforcement(playerId, reinforcements) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // Verify it's the player's turn and the reinforcement phase
    if (this.gameState.getCurrentPlayer().id !== playerId || 
        this.gameState.phase !== 'reinforcement') {
      return false;
    }
    
    // Calculate allowed reinforcements
    const allowedReinforcements = player.getReinforcementArmies(
      this.gameState.continents,
      this.gameState.territories
    );
    
    // Verify the total reinforcements don't exceed the allowed amount
    const totalReinforcements = Object.values(reinforcements).reduce(
      (sum, count) => sum + count, 0
    );
    
    if (totalReinforcements > allowedReinforcements) {
      return false;
    }
    
    // Apply reinforcements
    for (const [territoryId, count] of Object.entries(reinforcements)) {
      const territory = this.gameState.territories.find(t => t.id === territoryId);
      
      // Verify the player owns the territory
      if (!territory || territory.occupyingPlayer !== playerId) {
        return false;
      }
      
      territory.armies.infantry += count;
    }
    
    // Advance to the next phase
    this.gameState.nextPhase();
    return true;
  }

  /**
   * Process a player's attack
   * @param {string} playerId - ID of the attacking player
   * @param {string} fromTerritoryId - ID of the attacking territory
   * @param {string} toTerritoryId - ID of the defending territory
   * @param {number} attackDice - Number of dice to use (1-3)
   * @returns {Object} Attack result with dice rolls and outcome
   */
  processAttack(playerId, fromTerritoryId, toTerritoryId, attackDice) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Invalid player' };
    
    // Verify it's the player's turn and the attack phase
    if (this.gameState.getCurrentPlayer().id !== playerId || 
        this.gameState.phase !== 'attack') {
      return { success: false, error: 'Not your turn or phase' };
    }
    
    const fromTerritory = this.gameState.territories.find(t => t.id === fromTerritoryId);
    const toTerritory = this.gameState.territories.find(t => t.id === toTerritoryId);
    
    // Verify territories exist
    if (!fromTerritory || !toTerritory) {
      return { success: false, error: 'Invalid territory' };
    }
    
    // Verify the player owns the attacking territory
    if (fromTerritory.occupyingPlayer !== playerId) {
      return { success: false, error: 'You do not control the attacking territory' };
    }
    
    // Verify the player doesn't own the defending territory
    if (toTerritory.occupyingPlayer === playerId) {
      return { success: false, error: 'You cannot attack your own territory' };
    }
    
    // Verify the territories are adjacent
    if (!fromTerritory.isAdjacentTo(toTerritoryId)) {
      return { success: false, error: 'Territories are not adjacent' };
    }
    
    // Verify the attacking territory has enough armies
    if (fromTerritory.getTotalArmies() < 2) {
      return { success: false, error: 'Need at least 2 armies to attack' };
    }
    
    // Verify the attack dice count
    if (attackDice < 1 || attackDice > 3) {
      return { success: false, error: 'Invalid attack dice count' };
    }
    
    // Verify the attacking territory has enough armies for the dice count
    if (fromTerritory.getTotalArmies() <= attackDice) {
      return { success: false, error: 'Not enough armies for selected dice count' };
    }
    
    // Determine defense dice count (1 or 2)
    const defenseDice = Math.min(2, toTerritory.getTotalArmies());
    
    // Roll the dice
    const attackRolls = this.rollDice(attackDice);
    const defenseRolls = this.rollDice(defenseDice);
    
    // Sort dice in descending order
    attackRolls.sort((a, b) => b - a);
    defenseRolls.sort((a, b) => b - a);
    
    // Compare dice and determine casualties
    const maxComparisons = Math.min(attackRolls.length, defenseRolls.length);
    let attackerLosses = 0;
    let defenderLosses = 0;
    
    for (let i = 0; i < maxComparisons; i++) {
      if (attackRolls[i] > defenseRolls[i]) {
        defenderLosses++;
      } else {
        attackerLosses++;
      }
    }
    
    // Apply casualties
    // For now, just use infantry units for simplicity
    fromTerritory.armies.infantry -= attackerLosses;
    toTerritory.armies.infantry -= defenderLosses;
    
    // Check if defender is defeated
    let territoryConquered = false;
    if (toTerritory.getTotalArmies() === 0) {
      territoryConquered = true;
      
      // Find the defending player
      const defenderId = toTerritory.occupyingPlayer;
      const defender = this.gameState.players.find(p => p.id === defenderId);
      
      // Update territory ownership
      toTerritory.occupyingPlayer = playerId;
      toTerritory.armies.infantry = attackDice; // Move attacking dice count
      fromTerritory.armies.infantry -= attackDice;
      
      // Update player territory lists
      player.territories.push(toTerritoryId);
      defender.territories = defender.territories.filter(id => id !== toTerritoryId);
      
      // Check if defender is eliminated
      if (defender.territories.length === 0) {
        defender.eliminated = true;
        
        // Transfer defender's cards to attacker
        player.cards = player.cards.concat(defender.cards);
        defender.cards = [];
        
        // Check if game is over
        this.gameState.checkGameEnd();
      }
      
      // Award a card for conquering at least one territory this turn
      // (only awarded once per turn, would need a flag in gameState)
      // TODO: Implement card awarding
    }
    
    return {
      success: true,
      attackRolls,
      defenseRolls,
      attackerLosses,
      defenderLosses,
      territoryConquered
    };
  }

  /**
   * Process a player's fortification
   * @param {string} playerId - ID of the player
   * @param {string} fromTerritoryId - ID of the source territory
   * @param {string} toTerritoryId - ID of the destination territory
   * @param {number} armyCount - Number of armies to move
   * @returns {boolean} True if successful
   */
  processFortification(playerId, fromTerritoryId, toTerritoryId, armyCount) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // Verify it's the player's turn and the fortification phase
    if (this.gameState.getCurrentPlayer().id !== playerId || 
        this.gameState.phase !== 'fortification') {
      return false;
    }
    
    const fromTerritory = this.gameState.territories.find(t => t.id === fromTerritoryId);
    const toTerritory = this.gameState.territories.find(t => t.id === toTerritoryId);
    
    // Verify territories exist
    if (!fromTerritory || !toTerritory) {
      return false;
    }
    
    // Verify the player owns both territories
    if (fromTerritory.occupyingPlayer !== playerId || 
        toTerritory.occupyingPlayer !== playerId) {
      return false;
    }
    
    // Verify the territories are adjacent
    if (!fromTerritory.isAdjacentTo(toTerritoryId)) {
      return false;
    }
    
    // Verify the source territory has enough armies
    if (fromTerritory.getTotalArmies() <= armyCount) {
      return false;
    }
    
    // Move the armies (for simplicity, just using infantry)
    fromTerritory.armies.infantry -= armyCount;
    toTerritory.armies.infantry += armyCount;
    
    // Advance to the next phase/player
    this.gameState.nextPhase();
    return true;
  }

  /**
   * Roll dice and return the results
   * @param {number} count - Number of dice to roll
   * @returns {number[]} Array of dice roll results
   */
  rollDice(count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * 6) + 1);
    }
    return results;
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - The array to shuffle
   * @returns {Array} The shuffled array
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

export default GameEngine;

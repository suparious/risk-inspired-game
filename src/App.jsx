import React, { useState, useEffect } from 'react';
import GameBoard from './ui/GameBoard';
import GameDashboard from './ui/GameDashboard';
import TechTree from './ui/TechTree';
import CardSystem from './ui/CardSystem';
import SaveLoadMenu from './ui/SaveLoadMenu';
import EventsDisplay from './ui/EventsDisplay';
import EventNotification from './ui/EventNotification';
import GameEngine from './core/game-engine';
import { GameState } from './core/models.js';
import { AIPlayerFactory } from './core/ai-player';
import createSampleCards from './core/sample-cards';
import SaveLoadSystem from './core/save-load-system';
import './App.css';

const App = () => {
  const [gameEngine, setGameEngine] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [aiPlayers, setAiPlayers] = useState({});
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [activeView, setActiveView] = useState('game'); // 'game', 'tech', 'cards', 'events', 'settings'
  const [showSaveLoadMenu, setShowSaveLoadMenu] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [gameConfig, setGameConfig] = useState({
    mapId: 'classic',
    playerCount: 4,
    aiPlayers: 3,
    enableTechnologies: true,
    enableResources: true,
    enableEvents: true,
    enableAlliances: true,
    victoryConditions: ['military', 'economic', 'technological', 'diplomatic']
  });
  
  // Initialize game on component mount
  useEffect(() => {
    // Clear any existing autosaves that may be corrupted
    if (localStorage.getItem('risk-game-autosave')) {
      const loadFromAutoSave = window.confirm('An autosave was found. Do you want to load it?');
      if (loadFromAutoSave) {
        const success = loadGame('autosave');
        if (!success) {
          // If loading failed, delete the autosave and initialize a new game
          localStorage.removeItem('risk-game-autosave');
          initializeGame();
        }
      } else {
        // If user declined to load, delete the autosave and initialize a new game
        localStorage.removeItem('risk-game-autosave');
        initializeGame();
      }
    } else {
      // No autosave exists, initialize a new game
      initializeGame();
    }
  }, []);
  
  // Create autosave periodically
  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    
    // Clear any existing autosave interval
    if (window.autosaveInterval) {
      clearInterval(window.autosaveInterval);
    }
    
    // Create a new autosave interval
    window.autosaveInterval = setInterval(() => {
      console.log('Creating autosave...');
      try {
        SaveLoadSystem.createAutoSave(gameState);
      } catch (error) {
        console.error('Failed to create autosave:', error);
      }
    }, 60000); // Autosave every minute
    
    // Clean up on unmount
    return () => {
      if (window.autosaveInterval) {
        clearInterval(window.autosaveInterval);
      }
    };
  }, [gameState]);
  
  // Initialize a new game
  const initializeGame = () => {
    try {
      console.log('Initializing new game...');
      
      // Create game engine
      const engine = new GameEngine(gameConfig);
      
      // Initialize game state
      const state = engine.initializeGame();
      
      // Set human player ID
      const humanPlayerId = state.players[0].id;
      
      // Add some sample cards for testing
      const territoryIds = state.territories.map(t => t.id);
      const sampleCards = createSampleCards(territoryIds);
      state.players[0].cards = sampleCards.slice(0, 5); // Give the human player 5 cards
      
      // Create AI players
      const aiTypes = ['aggressive', 'defensive', 'expansionist', 'balanced'];
      const ais = {};
      
      for (let i = 1; i < state.players.length; i++) {
        const playerId = state.players[i].id;
        const aiType = aiTypes[i % aiTypes.length];
        ais[playerId] = AIPlayerFactory.createAI(playerId, aiType, 'medium');
      }
      
      setGameEngine(engine);
      setGameState(state);
      setCurrentPlayerId(humanPlayerId);
      setAiPlayers(ais);
      
      console.log('Game initialized successfully!');
    } catch (error) {
      console.error('Error initializing game:', error);
      alert(`Failed to initialize game: ${error.message}`);
    }
  };
  
  // Handle AI turns and event checking
  useEffect(() => {
    if (!gameState || !gameEngine || gameState.gameOver) return;
    
    const currentPlayer = gameState.getCurrentPlayer();
    
    // Check for events at the start of each player's turn during reinforcement phase
    if (gameState.phase === 'reinforcement' && gameState.eventsManager) {
      // Update active events (remove expired ones, apply ongoing effects)
      const expiredEvents = gameState.eventsManager.updateActiveEvents(currentPlayer.id);
      
      // If it's the human player's turn, check for new events
      if (currentPlayer.id === currentPlayerId) {
        const newEvent = gameState.eventsManager.checkForEvent(currentPlayerId);
        if (newEvent) {
          // Add gameState reference to provide context for territory names
          newEvent.gameState = gameState;
          setCurrentEvent(newEvent);
        }
      }
      
      // If any events were updated, refresh the game state
      if (expiredEvents.length > 0) {
        setGameState({ ...gameState });
      }
    }
    
    // If current player is AI, process AI turn
    if (currentPlayer && currentPlayer.id !== currentPlayerId && !currentPlayer.eliminated) {
      const ai = aiPlayers[currentPlayer.id];
      
      if (ai) {
        // Small delay to make AI turns visible
        const aiTurnTimeout = setTimeout(() => {
          // Check for AI events (but don't display them to the player)
          if (gameState.eventsManager && gameState.phase === 'reinforcement') {
            const aiEvent = gameState.eventsManager.checkForEvent(currentPlayer.id);
            // We don't need to set currentEvent here as these events are for AI players
          }
          
          // Perform AI turn
          const actions = ai.performTurn(gameState);
          console.log(`AI Player ${currentPlayer.name} actions:`, actions);
          
          // Update game state (in a real implementation, this would happen through the game engine)
          setGameState({ ...gameState });
        }, 1000);
        
        return () => clearTimeout(aiTurnTimeout);
      }
    }
  }, [gameState, gameEngine, currentPlayerId, aiPlayers]);
  
  // Check for game over
  useEffect(() => {
    if (gameState && gameState.gameOver && gameState.winner) {
      let message = `Game Over! ${gameState.winner.name} has won the game!`;
      
      // Show victory type if available
      if (gameState.victoryType) {
        const victoryTypes = {
          military: 'Military Victory (Domination)',
          economic: 'Economic Victory (Wealth Control)',
          technological: 'Technological Victory (Research Supremacy)',
          diplomatic: 'Diplomatic Victory (Alliance Leader)'
        };
        
        message += `\n\nVictory Type: ${victoryTypes[gameState.victoryType] || gameState.victoryType}`;
      }
      
      alert(message);
    }
  }, [gameState]);
  
  // Handler for territory selection
  const handleTerritoryClick = (territoryId) => {
    setSelectedTerritory(territoryId);
    
    // Get territory details
    const territory = gameState.territories.find(t => t.id === territoryId);
    console.log('Selected territory:', territory);
  };
  
  // Handler for ending the current phase
  const handleEndPhase = () => {
    if (!gameState || gameState.gameOver) return;
    
    // Check if it's the human player's turn
    if (gameState.getCurrentPlayer().id !== currentPlayerId) return;
    
    // If ending the attack phase and player conquered a territory, award a card
    if (gameState.phase === 'attack' && gameState.cardAwarded) {
      // Give the player a card from the deck
      if (gameState.cardDeck.length > 0) {
        const card = gameState.cardDeck.pop();
        gameState.players.find(p => p.id === currentPlayerId).cards.push(card);
        alert('You conquered a territory this turn and received a card!');
      }
      gameState.cardAwarded = false;
    }
    
    // Move to the next phase
    gameState.nextPhase();
    setGameState({ ...gameState });
  };
  
  // Handler for placing armies during reinforcement
  const handlePlaceArmies = (territoryId, armyCount) => {
    if (!gameState || gameState.gameOver) return;
    
    // Check if it's the human player's turn and the reinforcement phase
    if (gameState.getCurrentPlayer().id !== currentPlayerId || 
        gameState.phase !== 'reinforcement') return;
    
    // Create reinforcement map
    const reinforcements = {
      [territoryId]: armyCount
    };
    
    // Process reinforcement
    gameEngine.processReinforcement(currentPlayerId, reinforcements);
    setGameState({ ...gameState });
  };
  
  // Handler for attacking during attack phase
  const handleAttack = (fromTerritoryId, toTerritoryId, attackDice) => {
    if (!gameState || gameState.gameOver) return;
    
    // Check if it's the human player's turn and the attack phase
    if (gameState.getCurrentPlayer().id !== currentPlayerId || 
        gameState.phase !== 'attack') return;
    
    // Process attack using the game engine
    const result = gameEngine.processAttack(
      currentPlayerId,
      fromTerritoryId,
      toTerritoryId,
      attackDice
    );
    
    console.log('Attack result:', result);
    setGameState({ ...gameState });
    
    // Show attack result
    if (result.success) {
      let message = `Attack result: ${result.attackerLosses} attacker(s) lost, ${result.defenderLosses} defender(s) lost.`;
      
      if (result.territoryConquered) {
        // Get the territory name
        const defendingTerritory = gameState.territories.find(t => t.id === toTerritoryId);
        message += ` You conquered ${defendingTerritory.name}!`;
      }
      
      alert(message);
      
      // If the player has conquered at least one territory, award a card at the end of the attack phase
      if (result.territoryConquered && !gameState.cardAwarded) {
        gameState.cardAwarded = true;
      }
    } else if (result.error) {
      // Show error message if attack failed
      alert(result.error);
    }
  };
  
  // Handler for fortifying during fortification phase
  const handleFortify = (fromTerritoryId, toTerritoryId, armyCount) => {
    if (!gameState || gameState.gameOver) return;
    
    // Check if it's the human player's turn and the fortification phase
    if (gameState.getCurrentPlayer().id !== currentPlayerId || 
        gameState.phase !== 'fortification') return;
    
    // Process fortification
    gameEngine.processFortification(
      currentPlayerId,
      fromTerritoryId,
      toTerritoryId,
      armyCount
    );
    
    setGameState({ ...gameState });
  };
  
  // Handler for starting tech research
  const handleResearchTech = (techId) => {
    if (!gameState || !gameState.techManager || gameState.gameOver) return;
    
    // Start research
    const result = gameState.techManager.startResearch(currentPlayerId, techId);
    
    if (result) {
      console.log(`Started researching ${techId}`);
      setGameState({ ...gameState });
    } else {
      alert('Cannot research this technology at this time.');
    }
  };
  
  // Handler for trading in cards
  const handleTradeCards = (cardIds) => {
    if (!gameState || gameState.gameOver) return;
    
    // Check if it's the reinforcement phase
    if (gameState.phase !== 'reinforcement') {
      alert('Cards can only be traded during the Reinforcement phase.');
      return;
    }
    
    // Process card trade
    const result = gameState.processCardTrade(currentPlayerId, cardIds);
    
    if (result.success) {
      // Show success message
      let message = `Traded in cards for ${result.armies} armies!`;
      
      if (result.territoryBonuses && result.territoryBonuses.length > 0) {
        message += ` Including bonus armies for: ${result.territoryBonuses.join(', ')}`;
      }
      
      alert(message);
      setGameState({ ...gameState });
    } else {
      // Show error message
      alert(result.error || 'Failed to trade cards. Please try again.');
    }
  };
  
  // Handler for saving the game
  const handleSaveGame = (saveName) => {
    if (!gameState) return false;
    
    const success = SaveLoadSystem.saveGame(gameState, saveName);
    
    if (success) {
      alert(`Game saved as "${saveName}"!`);
      return true;
    } else {
      alert('Failed to save game. Please try again.');
      return false;
    }
  };
  
  // Handler for loading a game
  const handleLoadGame = (saveName) => {
    return loadGame(saveName);
  };
  
  // Load a game from a save
  const loadGame = (saveName) => {
    try {
      const serializedState = SaveLoadSystem.loadGame(saveName);
      
      if (!serializedState) {
        alert('Failed to load game. Save file may be corrupted or missing.');
        return false;
      }
      
      // Recreate game state from serialized data
      const loadedState = GameState.deserialize(serializedState);
      
      // Recreate game engine
      const engine = new GameEngine(loadedState.config);
      engine.gameState = loadedState;
      
      // Set the human player ID
      const humanPlayerId = loadedState.players.find(p => !p.id.startsWith('ai')).id;
      
      // Create AI players
      const aiTypes = ['aggressive', 'defensive', 'expansionist', 'balanced'];
      const ais = {};
      
      for (const player of loadedState.players) {
        if (player.id !== humanPlayerId) {
          const aiIndex = parseInt(player.id.replace('ai', '')) - 1;
          const aiType = aiTypes[aiIndex % aiTypes.length];
          ais[player.id] = AIPlayerFactory.createAI(player.id, aiType, 'medium');
        }
      }
      
      // Update state
      setGameEngine(engine);
      setGameState(loadedState);
      setCurrentPlayerId(humanPlayerId);
      setAiPlayers(ais);
      setActiveView('game');
      
      if (saveName !== 'autosave') {
        alert(`Game "${saveName}" loaded successfully!`);
      }
      setShowSaveLoadMenu(false);
      return true;
    } catch (error) {
      console.error('Error loading game:', error);
      alert(`Error loading game: ${error.message}`);
      return false;
    }
  };
  
  // Render loading state
  if (!gameState || !gameEngine) {
    return <div className="loading">Initializing game...</div>;
  }
  
  // Get the human player
  const humanPlayer = gameState.players.find(p => p.id === currentPlayerId);
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>RISK-Inspired Strategy Game</h1>
        
        <nav className="main-nav">
          <button 
            className={`nav-button ${activeView === 'game' ? 'active' : ''}`}
            onClick={() => setActiveView('game')}
          >
            Game Board
          </button>
          
          {gameState?.config?.enableTechnologies && (
            <button 
              className={`nav-button ${activeView === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveView('tech')}
            >
              Technology
            </button>
          )}
          
          <button 
            className={`nav-button ${activeView === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveView('cards')}
          >
            Cards ({humanPlayer.cards.length})
          </button>
          
          {gameState?.config?.enableEvents && (
            <button 
              className={`nav-button ${activeView === 'events' ? 'active' : ''}`}
              onClick={() => setActiveView('events')}
            >
              Events
            </button>
          )}
          
          <button 
            className={`nav-button ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            Settings
          </button>
          
          <button className="save-load-button" onClick={() => setShowSaveLoadMenu(true)}>
            Save/Load
          </button>
          
          <button className="new-game-button" onClick={initializeGame}>
            New Game
          </button>
        </nav>
      </header>
      
      <main className="app-content">
        {activeView === 'game' && (
          <div className="game-view">
            <GameBoard 
              gameState={gameState}
              onTerritoryClick={handleTerritoryClick}
            />
            
            <GameDashboard 
              gameState={gameState}
              currentPlayerId={currentPlayerId}
              onEndPhase={handleEndPhase}
              onPlaceArmies={handlePlaceArmies}
              onAttack={handleAttack}
              onFortify={handleFortify}
            />
          </div>
        )}
        
        {activeView === 'tech' && gameState?.config?.enableTechnologies && (
          <TechTree 
            gameState={gameState}
            playerId={currentPlayerId}
            onResearchTech={handleResearchTech}
          />
        )}
        
        {activeView === 'cards' && (
          <CardSystem
            gameState={gameState}
            playerId={currentPlayerId}
            onTradeCards={handleTradeCards}
          />
        )}
        
        {activeView === 'events' && gameState?.config?.enableEvents && (
          <EventsDisplay
            gameState={gameState}
            currentPlayerId={currentPlayerId}
          />
        )}
        
        {activeView === 'settings' && (
          <div className="settings-view">
            <h2>Game Settings</h2>
            <p>Settings functionality coming soon!</p>
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>RISK-Inspired Strategy Game &copy; 2025</p>
      </footer>
      
      {/* Save/Load Modal */}
      {showSaveLoadMenu && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSaveLoadMenu(false)}></div>
          <SaveLoadMenu 
            onSave={handleSaveGame}
            onLoad={handleLoadGame}
            onClose={() => setShowSaveLoadMenu(false)}
          />
        </>
      )}
      
      {/* Event Notification Modal */}
      {currentEvent && (
        <EventNotification 
          event={currentEvent} 
          onClose={() => setCurrentEvent(null)} 
        />
      )}
    </div>
  );
};

export default App;

(function () {
  // Tuned to be hard: players are expected to be caught and rely on
  // Banana API rescue puzzles (max 3 per run) to survive all three stages.
  // runnerChance / tankChance: share of spawns that are fast runners / 3-hit tanks.
  // waveEvery / waveSize: every N seconds a group of enemies rushes in together.
  const stages = [
    { id: 1, name: 'Infected Forest', seconds: 40, enemySpeed: 115, spawnEvery: 0.65, maxEnemies: 16, waveEvery: 5, waveSize: 6,
      runnerChance: 0.2, tankChance: 0.05, goalKills: 0, bossHp: 0, background: '#173b2e' },
    { id: 2, name: 'Abandoned Laboratory', seconds: 45, enemySpeed: 115, spawnEvery: 0.75, maxEnemies: 20, waveEvery: 7, waveSize: 6,
      runnerChance: 0.25, tankChance: 0.15, goalKills: 30, bossHp: 0, background: '#1c2947' },
    { id: 3, name: 'Final Extraction', seconds: 50, enemySpeed: 112, spawnEvery: 0.8, maxEnemies: 22, waveEvery: 9, waveSize: 6,
      runnerChance: 0.3, tankChance: 0.2, goalKills: 0, bossHp: 20, background: '#362136' }
  ];
  window.SurvivalStages = { get: (id) => stages[id - 1], all: stages };
})();

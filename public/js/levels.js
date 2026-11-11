(function () {
  const stages = [
    { id: 1, name: 'Infected Forest', seconds: 40, enemySpeed: 72, spawnEvery: 1.5, goalKills: 0, bossHp: 0, background: '#173b2e' },
    { id: 2, name: 'Abandoned Laboratory', seconds: 50, enemySpeed: 100, spawnEvery: 1.05, goalKills: 6, bossHp: 0, background: '#1c2947' },
    { id: 3, name: 'Final Extraction', seconds: 60, enemySpeed: 118, spawnEvery: .9, goalKills: 0, bossHp: 10, background: '#362136' }
  ];
  window.SurvivalStages = { get: (id) => stages[id - 1], all: stages };
})();
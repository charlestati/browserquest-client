import _ from 'lodash';

importScripts('../maps/world_client.js');

function tileIndexToGridPosition(_tileNum, mapData) {
  let tileNum = _tileNum;
  const getX = (num, w) => {
    if (num === 0) {
      return 0;
    }
    return (num % w === 0) ? w - 1 : (num % w) - 1;
  };

  tileNum -= 1;
  const x = getX(tileNum + 1, mapData.width);
  const y = Math.floor(tileNum / mapData.width);

  return { x, y };
}

function generateCollisionGrid(_mapData) {
  const mapData = _mapData;
  mapData.grid = [];
  for (let j, i = 0; i < mapData.height; i++) {
    mapData.grid[i] = [];
    for (j = 0; j < mapData.width; j++) {
      mapData.grid[i][j] = 0;
    }
  }

  _.each(mapData.collisions, (tileIndex) => {
    const pos = tileIndexToGridPosition(tileIndex + 1, mapData);
    mapData.grid[pos.y][pos.x] = 1;
  });

  _.each(mapData.blocking, (tileIndex) => {
    const pos = tileIndexToGridPosition(tileIndex + 1, mapData);
    if (mapData.grid[pos.y] !== undefined) {
      mapData.grid[pos.y][pos.x] = 1;
    }
  });
}

function generatePlateauGrid(_mapData) {
  const mapData = _mapData;
  let tileIndex = 0;

  mapData.plateauGrid = [];
  for (let j, i = 0; i < mapData.height; i++) {
    mapData.plateauGrid[i] = [];
    for (j = 0; j < mapData.width; j++) {
      if (_.includes(mapData.plateau, tileIndex)) {
        mapData.plateauGrid[i][j] = 1;
      } else {
        mapData.plateauGrid[i][j] = 0;
      }
      tileIndex += 1;
    }
  }
}

onmessage = () => {
  generateCollisionGrid(mapData);
  generatePlateauGrid(mapData);
  postMessage(mapData);
};

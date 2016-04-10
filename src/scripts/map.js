import log from 'log';
import $ from 'jquery';
import Area from './area';
import _ from 'lodash';
import Types from './gametypes';

// todo Find where to place this function
function isInt(n) {
  return (n % 1) === 0;
}

class Map {
  constructor(loadMultiTilesheets, game) {
    this.game = game;
    this.data = [];
    this.isLoaded = false;
    this.tilesetsLoaded = false;
    this.mapLoaded = false;
    this.loadMultiTilesheets = loadMultiTilesheets;

    // const useWorker = !(this.game.renderer.mobile || this.game.renderer.tablet);
    // todo Use useWorker instead of false
    // this._loadMap(useWorker);
    this._loadMap(false);
    this._initTilesets();
  }

  _checkReady() {
    if (this.tilesetsLoaded && this.mapLoaded) {
      this.isLoaded = true;
      if (this.ready_func) {
        this.ready_func();
      }
    }
  }

  _loadMap(useWorker) {
    const self = this;
    const filepath = 'maps/world_client.json';

    if (useWorker) {
      log.info('Loading map with web worker.');
      const worker = new Worker('js/mapworker.js');
      worker.postMessage(1);

      worker.onmessage = event => {
        const map = event.data;
        self._initMap(map);
        self.grid = map.grid;
        self.plateauGrid = map.plateauGrid;
        self.mapLoaded = true;
        self._checkReady();
      };
    } else {
      log.info('Loading map via Ajax.');
      $.get(filepath, data => {
        self._initMap(data);
        self._generateCollisionGrid();
        self._generatePlateauGrid();
        self.mapLoaded = true;
        self._checkReady();
      }, 'json');
    }
  }

  _initTilesets() {
    let tileset1;
    let tileset2;
    let tileset3;

    if (!this.loadMultiTilesheets) {
      this.tilesetCount = 1;
      tileset1 = this._loadTileset('images/1/tilesheet.png');
    } else {
      if (this.game.renderer.mobile || this.game.renderer.tablet) {
        this.tilesetCount = 1;
        tileset2 = this._loadTileset('images/2/tilesheet.png');
      } else {
        this.tilesetCount = 2;
        tileset2 = this._loadTileset('images/2/tilesheet.png');
        tileset3 = this._loadTileset('images/3/tilesheet.png');
      }
    }

    this.tilesets = [tileset1, tileset2, tileset3];
  }

  _initMap(map) {
    this.width = map.width;
    this.height = map.height;
    this.tilesize = map.tilesize;
    this.data = map.data;
    this.blocking = map.blocking || [];
    this.plateau = map.plateau || [];
    this.musicAreas = map.musicAreas || [];
    this.collisions = map.collisions;
    this.high = map.high;
    this.animated = map.animated;

    this.doors = this._getDoors(map);
    this.checkpoints = this._getCheckpoints(map);
  }

  _getDoors(map) {
    const doors = {};
    const self = this;

    _.each(map.doors, door => {
      let o;

      switch (door.to) {
        case 'u':
          o = Types.Orientations.UP;
          break;
        case 'd':
          o = Types.Orientations.DOWN;
          break;
        case 'l':
          o = Types.Orientations.LEFT;
          break;
        case 'r':
          o = Types.Orientations.RIGHT;
          break;
        default :
          o = Types.Orientations.DOWN;
      }

      doors[self.gridPositionToTileIndex(door.x, door.y)] = {
        x: door.tx,
        y: door.ty,
        orientation: o,
        cameraX: door.tcx,
        cameraY: door.tcy,
        portal: door.p === 1,
      };
    });

    return doors;
  }

  _loadTileset(filepath) {
    const self = this;
    const tileset = new Image();

    tileset.src = filepath;

    log.info(`Loading tileset: ${filepath}`);

    // todo Use Promise.map here
    tileset.onload = () => {
      if (tileset.width % self.tilesize > 0) {
        throw Error(`Tileset size should be a multiple of ${self.tilesize}`);
      }
      log.info('Map tileset loaded.');

      self.tilesetCount -= 1;
      if (self.tilesetCount === 0) {
        log.debug('All map tilesets loaded.');

        self.tilesetsLoaded = true;
        self._checkReady();
      }
    };

    return tileset;
  }

  // todo Use promises
  ready(f) {
    this.ready_func = f;
  }

  tileIndexToGridPosition(_tileNum) {
    let tileNum = _tileNum;
    const getX = (num, w) => {
      if (num === 0) {
        return 0;
      }
      return (num % w === 0) ? w - 1 : (num % w) - 1;
    };

    tileNum -= 1;
    const x = getX(tileNum + 1, this.width);
    const y = Math.floor(tileNum / this.width);

    return { x, y };
  }

  gridPositionToTileIndex(x, y) {
    return (y * this.width) + x + 1;
  }

  isColliding(x, y) {
    if (this.isOutOfBounds(x, y) || !this.grid) {
      return false;
    }
    return (this.grid[y][x] === 1);
  }

  isPlateau(x, y) {
    if (this.isOutOfBounds(x, y) || !this.plateauGrid) {
      return false;
    }
    return (this.plateauGrid[y][x] === 1);
  }

  _generateCollisionGrid() {
    const self = this;

    this.grid = [];
    for (let j, i = 0; i < this.height; i++) {
      this.grid[i] = [];
      for (j = 0; j < this.width; j++) {
        this.grid[i][j] = 0;
      }
    }

    _.each(this.collisions, tileIndex => {
      const pos = self.tileIndexToGridPosition(tileIndex + 1);
      self.grid[pos.y][pos.x] = 1;
    });

    _.each(this.blocking, tileIndex => {
      const pos = self.tileIndexToGridPosition(tileIndex + 1);
      if (self.grid[pos.y] !== undefined) {
        self.grid[pos.y][pos.x] = 1;
      }
    });
    log.info('Collision grid generated.');
  }

  _generatePlateauGrid() {
    let tileIndex = 0;

    this.plateauGrid = [];
    for (let j, i = 0; i < this.height; i++) {
      this.plateauGrid[i] = [];
      for (j = 0; j < this.width; j++) {
        if (_.includes(this.plateau, tileIndex)) {
          this.plateauGrid[i][j] = 1;
        } else {
          this.plateauGrid[i][j] = 0;
        }
        tileIndex += 1;
      }
    }
    log.info('Plateau grid generated.');
  }

  /**
   * Returns true if the given position is located within the dimensions of the map.
   *
   * @returns {Boolean} Whether the position is out of bounds.
   */
  isOutOfBounds(x, y) {
    return isInt(x) && isInt(y) && (x < 0 || x >= this.width || y < 0 || y >= this.height);
  }

  /**
   * Returns true if the given tile id is 'high', i.e. above all entities.
   * Used by the renderer to know which tiles to draw after all the entities
   * have been drawn.
   *
   * @param {Number} id The tile id in the tileset
   * @see Renderer.drawHighTiles
   */
  isHighTile(id) {
    return _.indexOf(this.high, id + 1) >= 0;
  }

  /**
   * Returns true if the tile is animated. Used by the renderer.
   * @param {Number} id The tile id in the tileset
   */
  isAnimatedTile(id) {
    return id + 1 in this.animated;
  }

  /**
   *
   */
  getTileAnimationLength(id) {
    return this.animated[id + 1].l;
  }

  /**
   *
   */
  getTileAnimationDelay(id) {
    const animProperties = this.animated[id + 1];
    if (animProperties.d) {
      return animProperties.d;
    }
    return 100;
  }

  isDoor(x, y) {
    return this.doors[this.gridPositionToTileIndex(x, y)] !== undefined;
  }

  getDoorDestination(x, y) {
    return this.doors[this.gridPositionToTileIndex(x, y)];
  }

  _getCheckpoints(map) {
    const checkpoints = [];
    _.each(map.checkpoints, cp => {
      const area = new Area(cp.x, cp.y, cp.w, cp.h);
      area.id = cp.id;
      checkpoints.push(area);
    });
    return checkpoints;
  }

  getCurrentCheckpoint(entity) {
    return _.find(this.checkpoints, checkpoint => checkpoint.contains(entity));
  }
}

export default Map;

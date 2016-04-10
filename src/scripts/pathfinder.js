import aStar from './lib/astar';
import _ from 'lodash';

class Pathfinder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = null;
    this.blankGrid = [];
    this.initBlankGrid_();
    this.ignored = [];
  }

  initBlankGrid_() {
    for (let i = 0; i < this.height; i += 1) {
      this.blankGrid[i] = [];
      for (let j = 0; j < this.width; j += 1) {
        this.blankGrid[i][j] = 0;
      }
    }
  }

  findPath(grid, entity, x, y, findIncomplete) {
    const start = [entity.gridX, entity.gridY];
    const end = [x, y];
    let path;

    this.grid = grid;
    this.applyIgnoreList_(true);
    path = aStar(this.grid, start, end);

    if (path.length === 0 && findIncomplete === true) {
      // If no path was found, try and find an incomplete one
      // to at least get closer to destination.
      path = this.findIncompletePath_(start, end);
    }

    return path;
  }

  /**
   * Finds a path which leads the closest possible to an unreachable x, y position.
   *
   * Whenever A* returns an empty path, it means that the destination tile is unreachable.
   * We would like the entities to move the closest possible to it though, instead of
   * staying where they are without moving at all. That's why we have this function which
   * returns an incomplete path to the chosen destination.
   *
   * @private
   * @returns {Array} The incomplete path towards the end position
   */
  findIncompletePath_(start, end) {
    const perfect = aStar(this.blankGrid, start, end);
    let x;
    let y;
    let incomplete = [];

    for (let i = perfect.length - 1; i > 0; i -= 1) {
      x = perfect[i][0];
      y = perfect[i][1];

      if (this.grid[y][x] === 0) {
        incomplete = aStar(this.grid, start, [x, y]);
        break;
      }
    }
    return incomplete;
  }

  /**
   * Removes colliding tiles corresponding to the given entity's position in the pathing grid.
   */
  ignoreEntity(entity) {
    if (entity) {
      this.ignored.push(entity);
    }
  }

  applyIgnoreList_(ignored) {
    const self = this;
    let x;
    let y;

    _.each(this.ignored, entity => {
      x = entity.isMoving() ? entity.nextGridX : entity.gridX;
      y = entity.isMoving() ? entity.nextGridY : entity.gridY;

      if (x >= 0 && y >= 0) {
        self.grid[y][x] = ignored ? 0 : 1;
      }
    });
  }

  clearIgnoreList() {
    this.applyIgnoreList_(false);
    this.ignored = [];
  }
}

export default Pathfinder;

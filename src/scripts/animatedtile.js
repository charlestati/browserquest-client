import Tile from './tile';

class AnimatedTile extends Tile {
  constructor(id, length, speed, index) {
    super();
    this.startId = id;
    this.id = id;
    this.length = length;
    this.speed = speed;
    this.index = index;
    this.lastTime = 0;
  }

  tick() {
    if ((this.id - this.startId) < this.length - 1) {
      this.id += 1;
    } else {
      this.id = this.startId;
    }
  }

  animate(time) {
    if ((time - this.lastTime) > this.speed) {
      this.tick();
      this.lastTime = time;
      return true;
    }
    return false;
  }
}

export default AnimatedTile;

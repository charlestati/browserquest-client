import log from 'log';

class Camera {
  constructor(renderer) {
    this.renderer = renderer;
    this.x = 0;
    this.y = 0;
    this.gridX = 0;
    this.gridY = 0;
    this.offset = 0.5;
    this.rescale();
  }

  rescale() {
    const factor = this.renderer.mobile ? 1 : 2;

    this.gridW = 15 * factor;
    this.gridH = 7 * factor;

    log.debug('---------');
    log.debug(`Factor:${factor}`);
    log.debug(`W:${this.gridW} H:${this.gridH}`);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;

    this.gridX = Math.floor(x / 16);
    this.gridY = Math.floor(y / 16);
  }

  setGridPosition(x, y) {
    this.gridX = x;
    this.gridY = y;

    this.x = this.gridX * 16;
    this.y = this.gridY * 16;
  }

  lookAt(entity) {
    const r = this.renderer;
    const x = Math.round(entity.x - (Math.floor(this.gridW / 2) * r.tilesize));
    const y = Math.round(entity.y - (Math.floor(this.gridH / 2) * r.tilesize));

    this.setPosition(x, y);
  }

  forEachVisiblePosition(callback, extra = 0) {
    for (let y = this.gridY - extra, maxY = this.gridY + this.gridH + (extra * 2);
         y < maxY; y += 1) {
      for (let x = this.gridX - extra, maxX = this.gridX + this.gridW + (extra * 2);
           x < maxX; x += 1) {
        callback(x, y);
      }
    }
  }

  isVisible(entity) {
    return this.isVisiblePosition(entity.gridX, entity.gridY);
  }

  isVisiblePosition(x, y) {
    return !!(y >= this.gridY && y < this.gridY + this.gridH
    && x >= this.gridX && x < this.gridX + this.gridW);
  }

  focusEntity(entity) {
    const w = this.gridW - 2;
    const h = this.gridH - 2;
    const x = Math.floor((entity.gridX - 1) / w) * w;
    const y = Math.floor((entity.gridY - 1) / h) * h;

    this.setGridPosition(x, y);
  }
}

export default Camera;

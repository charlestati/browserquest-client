import log from 'log';
import Types from './gametypes';

class Entity {
  constructor(id, kind) {
    this.id = id;
    this.kind = kind;

    // Renderer
    this.sprite = null;
    this.flipSpriteX = false;
    this.flipSpriteY = false;
    this.animations = null;
    this.currentAnimation = null;
    this.shadowOffsetY = 0;

    // Position
    this.setGridPosition(0, 0);

    // Modes
    this.isLoaded = false;
    this.isHighlighted = false;
    this.visible = true;
    this.isFading = false;
    this.setDirty();
  }

  setName(name) {
    this.name = name;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setGridPosition(x, y) {
    this.gridX = x;
    this.gridY = y;

    this.setPosition(x * 16, y * 16);
  }

  setSprite(sprite) {
    if (!sprite) {
      log.error(`${this.id} : sprite is null`, true);
      throw new Error('No sprite');
    }

    if (this.sprite && this.sprite.name === sprite.name) {
      return;
    }

    this.sprite = sprite;
    this.normalSprite = this.sprite;

    if (Types.isMob(this.kind) || Types.isPlayer(this.kind)) {
      this.hurtSprite = sprite.getHurtSprite();
    }

    this.animations = sprite.createAnimations();

    this.isLoaded = true;
    if (this.ready_func) {
      this.ready_func();
    }
  }

  getSprite() {
    return this.sprite;
  }

  getSpriteName() {
    return Types.getKindAsString(this.kind);
  }

  getAnimationByName(name) {
    let animation = null;

    if (name in this.animations) {
      animation = this.animations[name];
    } else {
      log.error(`No animation called ${name}`);
    }
    return animation;
  }

  setAnimation(name, speed, count, onEndCount) {
    const self = this;

    if (this.isLoaded) {
      if (this.currentAnimation && this.currentAnimation.name === name) {
        return;
      }

      const a = this.getAnimationByName(name);

      if (a) {
        this.currentAnimation = a;
        if (name.substr(0, 3) === 'atk') {
          this.currentAnimation.reset();
        }
        this.currentAnimation.setSpeed(speed);
        this.currentAnimation.setCount(count || 0, onEndCount || (() => { self.idle(); }));
      }
    } else {
      this.logError('Not ready for animation');
    }
  }

  hasShadow() {
    return false;
  }

  ready(f) {
    this.ready_func = f;
  }

  clean() {
    this.stopBlinking();
  }

  logInfo(message) {
    log.info(`[${this.id}] ${message}`);
  }

  logError(message) {
    log.error(`[${this.id}] ${message}`);
  }

  setHighlight(value) {
    if (value === true) {
      this.sprite = this.sprite.silhouetteSprite;
      this.isHighlighted = true;
    } else {
      this.sprite = this.normalSprite;
      this.isHighlighted = false;
    }
  }

  setVisible(value) {
    this.visible = value;
  }

  isVisible() {
    return this.visible;
  }

  toggleVisibility() {
    if (this.visible) {
      this.setVisible(false);
    } else {
      this.setVisible(true);
    }
  }

  /**
   *
   */
  getDistanceToEntity(entity) {
    const distX = Math.abs(entity.gridX - this.gridX);
    const distY = Math.abs(entity.gridY - this.gridY);

    return (distX > distY) ? distX : distY;
  }

  isCloseTo(entity) {
    let dx;
    let dy;
    let close = false;
    if (entity) {
      dx = Math.abs(entity.gridX - this.gridX);
      dy = Math.abs(entity.gridY - this.gridY);

      if (dx < 30 && dy < 14) {
        close = true;
      }
    }
    return close;
  }

  /**
   * Returns true if the entity is adjacent to the given one.
   * @returns {Boolean} Whether these two entities are adjacent.
   */
  isAdjacent(entity) {
    let adjacent = false;

    if (entity) {
      adjacent = this.getDistanceToEntity(entity) <= 1;
    }
    return adjacent;
  }

  /**
   *
   */
  isAdjacentNonDiagonal(entity) {
    let result = false;

    if (this.isAdjacent(entity) && !(this.gridX !== entity.gridX && this.gridY !== entity.gridY)) {
      result = true;
    }

    return result;
  }

  isDiagonallyAdjacent(entity) {
    return this.isAdjacent(entity) && !this.isAdjacentNonDiagonal(entity);
  }

  forEachAdjacentNonDiagonalPosition(callback) {
    callback(this.gridX - 1, this.gridY, Types.Orientations.LEFT);
    callback(this.gridX, this.gridY - 1, Types.Orientations.UP);
    callback(this.gridX + 1, this.gridY, Types.Orientations.RIGHT);
    callback(this.gridX, this.gridY + 1, Types.Orientations.DOWN);
  }

  fadeIn(currentTime) {
    this.isFading = true;
    this.startFadingTime = currentTime;
  }

  blink(speed) {
    const self = this;

    this.blinking = setInterval(() => {
      self.toggleVisibility();
    }, speed);
  }

  stopBlinking() {
    if (this.blinking) {
      clearInterval(this.blinking);
    }
    this.setVisible(true);
  }

  setDirty() {
    this.isDirty = true;
    if (this.dirty_callback) {
      this.dirty_callback(this);
    }
  }

  onDirty(dirtyCallback) {
    this.dirty_callback = dirtyCallback;
  }
}

export default Entity;

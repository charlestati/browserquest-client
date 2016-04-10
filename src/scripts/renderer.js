import _ from 'lodash';
import log from 'log';
import Camera from './camera';
import Item from './item';
import Character from './character';
import Player from './player';
import Timer from './timer';
import Detect from './detect';
import Types from './gametypes';

// todo Find where to put this
function getX(id, w) {
  if (id === 0) {
    return 0;
  }
  return (id % w === 0) ? w - 1 : (id % w) - 1;
}

class Renderer {
  constructor(game, canvas, background, foreground) {
    this.game = game;
    this.context = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;
    this.background = (background && background.getContext) ? background.getContext('2d') : null;
    this.foreground = (foreground && foreground.getContext) ? foreground.getContext('2d') : null;

    this.canvas = canvas;
    this.backcanvas = background;
    this.forecanvas = foreground;

    this.initFPS();
    this.tilesize = 16;

    this.upscaledRendering = this.context.mozImageSmoothingEnabled !== undefined;
    this.supportsSilhouettes = this.upscaledRendering;

    this.rescale(this.getScaleFactor());

    this.lastTime = new Date();
    this.frameCount = 0;
    this.maxFPS = this.FPS;
    this.realFPS = 0;
    this.isDebugInfoVisible = false;

    this.animatedTileCount = 0;
    this.highTileCount = 0;

    this.tablet = Detect.isTablet(window.innerWidth);

    this.fixFlickeringTimer = new Timer(100);
  }

  getWidth() {
    return this.canvas.width;
  }

  getHeight() {
    return this.canvas.height;
  }

  setTileset(tileset) {
    this.tileset = tileset;
  }

  getScaleFactor() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let scale;

    // todo Set this.mobile in another function
    this.mobile = false;

    if (w <= 1000) {
      scale = 2;
      this.mobile = true;
    } else if (w <= 1500 || h <= 870) {
      scale = 2;
    } else {
      scale = 3;
    }

    return scale;
  }

  rescale() {
    this.scale = this.getScaleFactor();

    this.createCamera();

    this.context.mozImageSmoothingEnabled = false;
    this.background.mozImageSmoothingEnabled = false;
    this.foreground.mozImageSmoothingEnabled = false;

    this.initFont();
    this.initFPS();

    if (!this.upscaledRendering && this.game.map && this.game.map.tilesets) {
      this.setTileset(this.game.map.tilesets[this.scale - 1]);
    }
    if (this.game.renderer) {
      this.game.setSpriteScale(this.scale);
    }
  }

  createCamera() {
    this.camera = new Camera(this);
    this.camera.rescale();

    this.canvas.width = this.camera.gridW * this.tilesize * this.scale;
    this.canvas.height = this.camera.gridH * this.tilesize * this.scale;
    log.debug(`#entities set to ${this.canvas.width} x ${this.canvas.height}`);

    this.backcanvas.width = this.canvas.width;
    this.backcanvas.height = this.canvas.height;
    log.debug(`#background set to ${this.backcanvas.width} x ${this.backcanvas.height}`);

    this.forecanvas.width = this.canvas.width;
    this.forecanvas.height = this.canvas.height;
    log.debug(`#foreground set to ${this.forecanvas.width} x ${this.forecanvas.height}`);
  }

  initFPS() {
    this.FPS = this.mobile ? 50 : 50;
  }

  initFont() {
    let fontsize;

    switch (this.scale) {
      case 2:
        fontsize = Detect.isWindows() ? 10 : 13;
        break;
      case 3:
        fontsize = 20;
        break;
      default:
        fontsize = 10;
    }
    this.setFontSize(fontsize);
  }

  setFontSize(size) {
    const font = `${size}px GraphicPixel`;

    this.context.font = font;
    this.background.font = font;
  }

  drawText(text, x, y, centered, color, strokeColor) {
    const ctx = this.context;

    let strokeSize;

    switch (this.scale) {
      case 2:
        strokeSize = 3;
        break;
      case 3:
        strokeSize = 5;
        break;
      default:
        strokeSize = 3;
    }

    if (text && x && y) {
      ctx.save();
      if (centered) {
        ctx.textAlign = 'center';
      }
      ctx.strokeStyle = strokeColor || '#373737';
      ctx.lineWidth = strokeSize;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color || 'white';
      ctx.fillText(text, x, y);
      ctx.restore();
    }
  }

  drawCellRect(x, y, color) {
    this.context.save();
    this.context.lineWidth = 2 * this.scale;
    this.context.strokeStyle = color;
    this.context.translate(x + 2, y + 2);
    this.context.strokeRect(0, 0, (this.tilesize * this.scale) - 4,
      (this.tilesize * this.scale) - 4);
    this.context.restore();
  }

  drawCellHighlight(x, y, color) {
    const s = this.scale;
    const ts = this.tilesize;
    const tx = x * ts * s;
    const ty = y * ts * s;

    this.drawCellRect(tx, ty, color);
  }

  drawTargetCell() {
    const mouse = this.game.getMouseGridPosition();

    if (this.game.targetCellVisible
      && !(mouse.x === this.game.selectedX && mouse.y === this.game.selectedY)) {
      this.drawCellHighlight(mouse.x, mouse.y, this.game.targetColor);
    }
  }

  drawAttackTargetCell() {
    const mouse = this.game.getMouseGridPosition();
    const entity = this.game.getEntityAt(mouse.x, mouse.y);
    const s = this.scale;

    if (entity) {
      this.drawCellRect(entity.x * s, entity.y * s, 'rgba(255, 0, 0, 0.5)');
    }
  }

  drawOccupiedCells() {
    const positions = this.game.entityGrid;

    if (positions) {
      for (let i = 0; i < positions.length; i += 1) {
        for (let j = 0; j < positions[i].length; j += 1) {
          if (!_.isNull(positions[i][j])) {
            this.drawCellHighlight(i, j, 'rgba(50, 50, 255, 0.5)');
          }
        }
      }
    }
  }

  drawPathingCells() {
    const grid = this.game.pathingGrid;

    if (grid && this.game.debugPathing) {
      for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid[y].length; x += 1) {
          if (grid[y][x] === 1 && this.game.camera.isVisiblePosition(x, y)) {
            this.drawCellHighlight(x, y, 'rgba(50, 50, 255, 0.5)');
          }
        }
      }
    }
  }

  drawSelectedCell() {
    const sprite = this.game.cursors.target;
    const anim = this.game.targetAnimation;
    const os = this.upscaledRendering ? 1 : this.scale;
    const ds = this.upscaledRendering ? this.scale : 1;

    if (this.game.selectedCellVisible) {
      if (this.mobile || this.tablet) {
        if (this.game.drawTarget) {
          const x = this.game.selectedX;
          const y = this.game.selectedY;

          this.drawCellHighlight(this.game.selectedX, this.game.selectedY, 'rgb(51, 255, 0)');
          this.lastTargetPos = {
            x,
            y,
          };
          this.game.drawTarget = false;
        }
      } else {
        if (sprite && anim) {
          const frame = anim.currentFrame;
          const s = this.scale;
          const x = frame.x * os;
          const y = frame.y * os;
          const w = sprite.width * os;
          const h = sprite.height * os;
          const ts = 16;
          const dx = this.game.selectedX * ts * s;
          const dy = this.game.selectedY * ts * s;
          const dw = w * ds;
          const dh = h * ds;

          this.context.save();
          this.context.translate(dx, dy);
          this.context.drawImage(sprite.image, x, y, w, h, 0, 0, dw, dh);
          this.context.restore();
        }
      }
    }
  }

  clearScaledRect(ctx, x, y, w, h) {
    const s = this.scale;

    ctx.clearRect(x * s, y * s, w * s, h * s);
  }

  drawCursor() {
    const mx = this.game.mouse.x;
    const my = this.game.mouse.y;
    const s = this.scale;
    const os = this.upscaledRendering ? 1 : this.scale;

    this.context.save();
    if (this.game.currentCursor && this.game.currentCursor.isLoaded) {
      this.context.drawImage(this.game.currentCursor.image, 0, 0, 14 * os,
        14 * os, mx, my, 14 * s, 14 * s);
    }
    this.context.restore();
  }

  drawScaledImage(ctx, image, x, y, w, h, dx, dy) {
    const s = this.upscaledRendering ? 1 : this.scale;
    // todo Fix the .bind() issue and use rest arguments
    _.each(arguments, arg => {
      if (_.isUndefined(arg) || _.isNaN(arg) || _.isNull(arg) || arg < 0) {
        log.error(`x:${x} y:${y} w:${w} h:${h} dx:${dx} dy:${dy}`, true);
        throw Error('A problem occured when trying to draw on the canvas');
      }
    });

    ctx.drawImage(
      image,
      x * s,
      y * s,
      w * s,
      h * s,
      dx * this.scale,
      dy * this.scale,
      w * this.scale,
      h * this.scale
    );
  }

  drawTile(ctx, tileid, tileset, setW, gridW, cellid) {
    const s = this.upscaledRendering ? 1 : this.scale;
    if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
      this.drawScaledImage(
        ctx,
        tileset,
        getX(tileid + 1, (setW / s)) * this.tilesize,
        Math.floor(tileid / (setW / s)) * this.tilesize,
        this.tilesize,
        this.tilesize,
        getX(cellid + 1, gridW) * this.tilesize,
        Math.floor(cellid / gridW) * this.tilesize
      );
    }
  }

  clearTile(ctx, gridW, cellid) {
    const s = this.scale;
    const ts = this.tilesize;
    const x = getX(cellid + 1, gridW) * ts * s;
    const y = Math.floor(cellid / gridW) * ts * s;
    const w = ts * s;
    const h = w;

    ctx.clearRect(x, y, h, w);
  }

  drawEntity(entity) {
    const sprite = entity.sprite;
    const shadow = this.game.shadows.small;
    const anim = entity.currentAnimation;
    const os = this.upscaledRendering ? 1 : this.scale;
    const ds = this.upscaledRendering ? this.scale : 1;

    if (anim && sprite) {
      const frame = anim.currentFrame;
      const s = this.scale;
      const x = frame.x * os;
      const y = frame.y * os;
      const w = sprite.width * os;
      const h = sprite.height * os;
      const ox = sprite.offsetX * s;
      const oy = sprite.offsetY * s;
      const dx = entity.x * s;
      const dy = entity.y * s;
      const dw = w * ds;
      const dh = h * ds;

      if (entity.isFading) {
        this.context.save();
        this.context.globalAlpha = entity.fadingAlpha;
      }

      if (!this.mobile && !this.tablet) {
        this.drawEntityName(entity);
      }

      this.context.save();
      if (entity.flipSpriteX) {
        this.context.translate(dx + this.tilesize * s, dy);
        this.context.scale(-1, 1);
      } else if (entity.flipSpriteY) {
        this.context.translate(dx, dy + dh);
        this.context.scale(1, -1);
      } else {
        this.context.translate(dx, dy);
      }

      if (entity.isVisible()) {
        if (entity.hasShadow()) {
          this.context.drawImage(
            shadow.image,
            0,
            0,
            shadow.width * os,
            shadow.height * os,
            0,
            entity.shadowOffsetY * ds,
            shadow.width * os * ds,
            shadow.height * os * ds
          );
        }

        this.context.drawImage(sprite.image, x, y, w, h, ox, oy, dw, dh);

        if (entity instanceof Item && entity.kind !== Types.Entities.CAKE) {
          const sparks = this.game.sprites.sparks;
          const anim = this.game.sparksAnimation;
          const frame = anim.currentFrame;
          const sx = sparks.width * frame.index * os;
          const sy = sparks.height * anim.row * os;
          const sw = sparks.width * os;
          const sh = sparks.width * os;

          this.context.drawImage(
            sparks.image,
            sx,
            sy,
            sw,
            sh,
            sparks.offsetX * s,
            sparks.offsetY * s,
            sw * ds,
            sh * ds
          );
        }
      }

      if (entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
        const weapon = this.game.sprites[entity.getWeaponName()];

        if (weapon) {
          const weaponAnimData = weapon.animationData[anim.name];
          const index = frame.index < weaponAnimData.length ?
            frame.index : frame.index % weaponAnimData.length;
          const wx = weapon.width * index * os;
          const wy = weapon.height * anim.row * os;
          const ww = weapon.width * os;
          const wh = weapon.height * os;

          this.context.drawImage(
            weapon.image,
            wx,
            wy,
            ww,
            wh,
            weapon.offsetX * s,
            weapon.offsetY * s,
            ww * ds,
            wh * ds
          );
        }
      }

      this.context.restore();

      if (entity.isFading) {
        this.context.restore();
      }
    }
  }

  drawEntities(dirtyOnly) {
    const self = this;

    this.game.forEachVisibleEntityByDepth(_entity => {
      const entity = _entity;
      if (entity.isLoaded) {
        if (dirtyOnly) {
          if (entity.isDirty) {
            self.drawEntity(entity);

            entity.isDirty = false;
            entity.oldDirtyRect = entity.dirtyRect;
            entity.dirtyRect = null;
          }
        } else {
          self.drawEntity(entity);
        }
      }
    });
  }

  drawDirtyEntities() {
    this.drawEntities(true);
  }

  clearDirtyRect(r) {
    this.context.clearRect(r.x, r.y, r.w, r.h);
  }

  clearDirtyRects() {
    const self = this;
    let count = 0;

    this.game.forEachVisibleEntityByDepth(entity => {
      if (entity.isDirty && entity.oldDirtyRect) {
        self.clearDirtyRect(entity.oldDirtyRect);
        count += 1;
      }
    });

    this.game.forEachAnimatedTile(tile => {
      if (tile.isDirty) {
        self.clearDirtyRect(tile.dirtyRect);
        count += 1;
      }
    });

    if (this.game.clearTarget && this.lastTargetPos) {
      const last = this.lastTargetPos;
      const rect = this.getTargetBoundingRect(last.x, last.y);

      this.clearDirtyRect(rect);
      this.game.clearTarget = false;
      count += 1;
    }

    if (count > 0) {
      // log.debug('count:'+count);
    }
  }

  getEntityBoundingRect(entity) {
    const rect = {};
    const s = this.scale;
    let spr;

    if (entity instanceof Player && entity.hasWeapon()) {
      const weapon = this.game.sprites[entity.getWeaponName()];
      spr = weapon;
    } else {
      spr = entity.sprite;
    }

    if (spr) {
      rect.x = (entity.x + spr.offsetX - this.camera.x) * s;
      rect.y = (entity.y + spr.offsetY - this.camera.y) * s;
      rect.w = spr.width * s;
      rect.h = spr.height * s;
      rect.left = rect.x;
      rect.right = rect.x + rect.w;
      rect.top = rect.y;
      rect.bottom = rect.y + rect.h;
    }
    return rect;
  }

  getTileBoundingRect(tile) {
    const rect = {};
    const gridW = this.game.map.width;
    const s = this.scale;
    const ts = this.tilesize;
    const cellid = tile.index;

    rect.x = ((getX(cellid + 1, gridW) * ts) - this.camera.x) * s;
    rect.y = ((Math.floor(cellid / gridW) * ts) - this.camera.y) * s;
    rect.w = ts * s;
    rect.h = ts * s;
    rect.left = rect.x;
    rect.right = rect.x + rect.w;
    rect.top = rect.y;
    rect.bottom = rect.y + rect.h;

    return rect;
  }

  getTargetBoundingRect(x, y) {
    const rect = {};
    const s = this.scale;
    const ts = this.tilesize;
    const tx = x || this.game.selectedX;
    const ty = y || this.game.selectedY;

    rect.x = ((tx * ts) - this.camera.x) * s;
    rect.y = ((ty * ts) - this.camera.y) * s;
    rect.w = ts * s;
    rect.h = ts * s;
    rect.left = rect.x;
    rect.right = rect.x + rect.w;
    rect.top = rect.y;
    rect.bottom = rect.y + rect.h;

    return rect;
  }

  isIntersecting(rect1, rect2) {
    return !((rect2.left > rect1.right) ||
    (rect2.right < rect1.left) ||
    (rect2.top > rect1.bottom) ||
    (rect2.bottom < rect1.top));
  }

  drawEntityName(entity) {
    this.context.save();
    if (entity.name && entity instanceof Player) {
      const color = (entity.id === this.game.playerId) ? '#fcda5c' : 'white';
      this.drawText(
        entity.name,
        (entity.x + 8) * this.scale,
        (entity.y + entity.nameOffsetY) * this.scale,
        true,
        color
      );
    }
    this.context.restore();
  }

  drawTerrain() {
    const self = this;
    const m = this.game.map;
    const tilesetwidth = this.tileset.width / m.tilesize;

    this.game.forEachVisibleTile((id, index) => {
      if (!m.isHighTile(id) && !m.isAnimatedTile(id)) { // Don't draw unnecessary tiles
        self.drawTile(self.background, id, self.tileset, tilesetwidth, m.width, index);
      }
    }, 1);
  }

  drawAnimatedTiles(dirtyOnly) {
    const self = this;
    const m = this.game.map;
    const tilesetwidth = this.tileset.width / m.tilesize;

    this.animatedTileCount = 0;
    this.game.forEachAnimatedTile(_tile => {
      const tile = _tile;
      if (dirtyOnly) {
        if (tile.isDirty) {
          self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
          tile.isDirty = false;
        }
      } else {
        self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
        self.animatedTileCount += 1;
      }
    });
  }

  drawDirtyAnimatedTiles() {
    this.drawAnimatedTiles(true);
  }

  drawHighTiles(ctx) {
    const self = this;
    const m = this.game.map;
    const tilesetwidth = this.tileset.width / m.tilesize;

    this.highTileCount = 0;
    this.game.forEachVisibleTile((id, index) => {
      if (m.isHighTile(id)) {
        self.drawTile(ctx, id, self.tileset, tilesetwidth, m.width, index);
        self.highTileCount += 1;
      }
    }, 1);
  }

  drawBackground(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawFPS() {
    const nowTime = new Date();
    const diffTime = nowTime.getTime() - this.lastTime.getTime();

    if (diffTime >= 1000) {
      this.realFPS = this.frameCount;
      this.frameCount = 0;
      this.lastTime = nowTime;
    }
    this.frameCount++;

    // this.drawText('FPS: ' + this.realFPS + ' / ' + this.maxFPS, 30, 30, false);
    this.drawText(`FPS: ${this.realFPS}`, 30, 30, false);
  }

  drawDebugInfo() {
    if (this.isDebugInfoVisible) {
      this.drawFPS();
      this.drawText(`A: ${this.animatedTileCount}`, 100, 30, false);
      this.drawText(`H: ${this.highTileCount}`, 140, 30, false);
    }
  }

  drawCombatInfo() {
    const self = this;

    switch (this.scale) {
      case 3:
        this.setFontSize(30);
        break;
      default:
        this.setFontSize(20);
    }
    this.game.infoManager.forEachInfo(info => {
      self.context.save();
      self.context.globalAlpha = info.opacity;
      self.drawText(
        info.value,
        (info.x + 8) * self.scale,
        Math.floor(info.y * self.scale),
        true,
        info.fillColor,
        info.strokeColor
      );
      self.context.restore();
    });
    this.initFont();
  }

  setCameraView(ctx) {
    ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
  }

  clearScreen(ctx) {
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getPlayerImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const os = this.upscaledRendering ? 1 : this.scale;
    const player = this.game.player;
    const sprite = player.getArmorSprite();
    const spriteAnim = sprite.animationData.idle_down;
    // character
    const row = spriteAnim.row;
    const w = sprite.width * os;
    const h = sprite.height * os;
    const y = row * h;
    // weapon
    const weapon = this.game.sprites[this.game.player.getWeaponName()];
    const ww = weapon.width * os;
    const wh = weapon.height * os;
    const wy = wh * row;
    const offsetX = (weapon.offsetX - sprite.offsetX) * os;
    const offsetY = (weapon.offsetY - sprite.offsetY) * os;
    // shadow
    const shadow = this.game.shadows.small;
    const sw = shadow.width * os;
    const sh = shadow.height * os;
    const ox = -sprite.offsetX * os;
    const oy = -sprite.offsetY * os;

    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(shadow.image, 0, 0, sw, sh, ox, oy, sw, sh);
    ctx.drawImage(sprite.image, 0, y, w, h, 0, 0, w, h);
    ctx.drawImage(weapon.image, 0, wy, ww, wh, offsetX, offsetY, ww, wh);

    return canvas.toDataURL('image/png');
  }

  renderStaticCanvases() {
    this.background.save();
    this.setCameraView(this.background);
    this.drawTerrain();
    this.background.restore();

    if (this.mobile || this.tablet) {
      this.clearScreen(this.foreground);
      this.foreground.save();
      this.setCameraView(this.foreground);
      this.drawHighTiles(this.foreground);
      this.foreground.restore();
    }
  }

  renderFrame() {
    if (this.mobile || this.tablet) {
      this.renderFrameMobile();
    } else {
      this.renderFrameDesktop();
    }
  }

  renderFrameDesktop() {
    this.clearScreen(this.context);

    this.context.save();
    this.setCameraView(this.context);
    this.drawAnimatedTiles();

    if (this.game.started) {
      this.drawSelectedCell();
      this.drawTargetCell();
    }

    // this.drawOccupiedCells();
    this.drawPathingCells();
    this.drawEntities();
    this.drawCombatInfo();
    this.drawHighTiles(this.context);
    this.context.restore();

    // Overlay UI elements
    this.drawCursor();
    this.drawDebugInfo();
  }

  renderFrameMobile() {
    this.clearDirtyRects();
    this.preventFlickeringBug();

    this.context.save();
    this.setCameraView(this.context);

    this.drawDirtyAnimatedTiles();
    this.drawSelectedCell();
    this.drawDirtyEntities();
    this.context.restore();
  }

  preventFlickeringBug() {
    if (this.fixFlickeringTimer.isOver(this.game.currentTime)) {
      this.background.fillRect(0, 0, 0, 0);
      this.context.fillRect(0, 0, 0, 0);
      this.foreground.fillRect(0, 0, 0, 0);
    }
  }
}

export default Renderer;

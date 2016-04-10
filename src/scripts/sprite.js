import log from 'log';
import Animation from './animation';
import sprites from './sprites';

class Sprite {
  constructor(name, scale) {
    this.name = name;
    this.scale = scale;
    this.isLoaded = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.loadJSON(sprites[name]);
  }

  loadJSON(data) {
    this.id = data.id;
    this.filepath = `images/${this.scale}/${this.id}.png`;
    this.animationData = data.animations;
    this.width = data.width;
    this.height = data.height;
    this.offsetX = (data.offset_x !== undefined) ? data.offset_x : -16;
    this.offsetY = (data.offset_y !== undefined) ? data.offset_y : -16;

    this.load();
  }

  load() {
    const self = this;

    this.image = new Image();
    this.image.src = this.filepath;

    this.image.onload = () => {
      self.isLoaded = true;

      // todo Use promises
      if (self.onload_func) {
        self.onload_func();
      }
    };
  }

  createAnimations() {
    const animations = {};

    // todo Fix with hasOwnProperty()
    for (const name in this.animationData) {
      const a = this.animationData[name];
      animations[name] = new Animation(name, a.length, a.row, this.width, this.height);
    }

    return animations;
  }

  createHurtSprite() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = this.image.width;
    const height = this.image.height;
    let spriteData;
    let data;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(this.image, 0, 0, width, height);

    try {
      spriteData = ctx.getImageData(0, 0, width, height);

      data = spriteData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = data[i + 2] = 75;
      }
      spriteData.data = data;

      ctx.putImageData(spriteData, 0, 0);

      this.whiteSprite = {
        image: canvas,
        isLoaded: true,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        width: this.width,
        height: this.height,
      };
    } catch (e) {
      log.error(`Error getting image data for sprite : ${this.name}`);
    }
  }

  getHurtSprite() {
    return this.whiteSprite;
  }

  createSilhouette() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = this.image.width;
    const height = this.image.height;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(this.image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const finalData = ctx.getImageData(0, 0, width, height);
    const fdata = finalData.data;

    const getIndex = (x, y) => ((width * (y - 1)) + x - 1) * 4;

    const getPosition = i => {
      const x = (i / 4) + 1 % width;
      const y = (((i / 4) + 1 - x) / width) + 1;

      return { x, y };
    };

    function isBlankPixel(i) {
      if (i < 0 || i >= data.length) {
        return true;
      }
      return data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 0;
    }

    const hasAdjacentPixel = i => {
      const pos = getPosition(i);

      if (pos.x < width && !isBlankPixel(getIndex(pos.x + 1, pos.y))) {
        return true;
      }
      if (pos.x > 1 && !isBlankPixel(getIndex(pos.x - 1, pos.y))) {
        return true;
      }
      if (pos.y < height && !isBlankPixel(getIndex(pos.x, pos.y + 1))) {
        return true;
      }
      if (pos.y > 1 && !isBlankPixel(getIndex(pos.x, pos.y - 1))) {
        return true;
      }
      return false;
    };

    for (let i = 0; i < data.length; i += 4) {
      if (isBlankPixel(i) && hasAdjacentPixel(i)) {
        fdata[i] = fdata[i + 1] = 255;
        fdata[i + 2] = 150;
        fdata[i + 3] = 150;
      }
    }

    finalData.data = fdata;
    ctx.putImageData(finalData, 0, 0);

    this.silhouetteSprite = {
      image: canvas,
      isLoaded: true,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      width: this.width,
      height: this.height,
    };
  }
}

export default Sprite;

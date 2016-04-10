class DamageInfo {
  constructor(id, value, x, y, duration, type) {
    this.id = id;
    this.value = value;
    this.duration = duration;
    this.x = x;
    this.y = y;
    this.opacity = 1.0;
    this.lastTime = 0;
    this.speed = 100;
    this.colors = {
      received: {
        fill: 'rgb(255, 50, 50)',
        stroke: 'rgb(255, 180, 180)',
      },
      inflicted: {
        fill: 'white',
        stroke: '#373737',
      },
      healed: {
        fill: 'rgb(80, 255, 80)',
        stroke: 'rgb(50, 120, 50)',
      },
    };
    this.fillColor = this.colors[type].fill;
    this.strokeColor = this.colors[type].stroke;
    this.DURATION = 1000;
  }

  isTimeToAnimate(time) {
    return (time - this.lastTime) > this.speed;
  }

  update(time) {
    if (this.isTimeToAnimate(time)) {
      this.lastTime = time;
      this.tick();
    }
  }

  tick() {
    this.y -= 1;
    this.opacity -= 0.07;
    if (this.opacity < 0) {
      this.destroy();
    }
  }

  onDestroy(callback) {
    this.destroy_callback = callback;
  }

  destroy() {
    if (this.destroy_callback) {
      this.destroy_callback(this.id);
    }
  }
}

export default DamageInfo;

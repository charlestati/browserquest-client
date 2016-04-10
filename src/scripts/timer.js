class Timer {
  constructor(duration, startTime) {
    this.lastTime = startTime || 0;
    this.duration = duration;
  }

  isOver(time) {
    let over = false;

    if ((time - this.lastTime) > this.duration) {
      over = true;
      this.lastTime = time;
    }
    return over;
  }
}

export default Timer;

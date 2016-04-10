import $ from 'jquery';
import Timer from './timer';

class Bubble {
  constructor(id, element, time) {
    this.id = id;
    this.element = element;
    this.timer = new Timer(5000, time);
  }

  isOver(time) {
    return !!this.timer.isOver(time);
  }

  destroy() {
    $(this.element).remove();
  }

  reset(time) {
    this.timer.lastTime = time;
  }
}

export default Bubble;

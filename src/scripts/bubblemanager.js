import $ from 'jquery';
import _ from 'lodash';
import Bubble from './bubble';

class BubbleManager {
  constructor(container) {
    this.container = container;
    this.bubbles = {};
  }

  getBubbleById(id) {
    if (id in this.bubbles) {
      return this.bubbles[id];
    }
    return null;
  }

  create(id, message, time) {
    if (this.bubbles[id]) {
      this.bubbles[id].reset(time);
      $(`#${id} p`).html(message);
    } else {
      const el = $(`<div id="${id}" class="bubble">
<p>${message}</p><div class="thingy"></div></div>`); // .attr('id', id);
      $(el).appendTo(this.container);

      this.bubbles[id] = new Bubble(id, el, time);
    }
  }

  update(time) {
    const self = this;
    const bubblesToDelete = [];

    _.each(this.bubbles, bubble => {
      if (bubble.isOver(time)) {
        bubble.destroy();
        bubblesToDelete.push(bubble.id);
      }
    });

    _.each(bubblesToDelete, id => {
      delete self.bubbles[id];
    });
  }

  clean() {
    const self = this;
    const bubblesToDelete = [];

    _.each(this.bubbles, bubble => {
      bubble.destroy();
      bubblesToDelete.push(bubble.id);
    });

    _.each(bubblesToDelete, id => {
      delete self.bubbles[id];
    });

    this.bubbles = {};
  }

  destroyBubble(id) {
    const bubble = this.getBubbleById(id);

    if (bubble) {
      bubble.destroy();
      delete this.bubbles[id];
    }
  }

  forEachBubble(callback) {
    _.each(this.bubbles, bubble => {
      callback(bubble);
    });
  }
}

export default BubbleManager;

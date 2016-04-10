import _ from 'lodash';
import DamageInfo from './damageinfo';

class InfoManager {
  constructor(game) {
    this.game = game;
    this.infos = {};
    this.destroyQueue = [];
  }

  addDamageInfo(value, x, y, type) {
    const time = this.game.currentTime;
    const id = `${time}${Math.abs(value)}${x}${y}`;
    const self = this;
    const info = new DamageInfo(id, value, x, y, DamageInfo.DURATION, type);

    info.onDestroy(destroyId => {
      self.destroyQueue.push(destroyId);
    });
    this.infos[id] = info;
  }

  forEachInfo(callback) {
    _.each(this.infos, (info) => {
      callback(info);
    });
  }

  update(time) {
    const self = this;

    this.forEachInfo(info => {
      info.update(time);
    });

    _.each(this.destroyQueue, id => {
      delete self.infos[id];
    });
    this.destroyQueue = [];
  }
}

export default InfoManager;

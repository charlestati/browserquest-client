import log from 'log';
import _ from 'lodash';
import Area from './area';
import Detect from './detect';

class AudioManager {
  constructor(game) {
    const self = this;

    this.enabled = true;
    this.extension = Detect.canPlayMP3() ? 'mp3' : 'ogg';
    this.sounds = {};
    this.game = game;
    this.currentMusic = null;
    this.areas = [];
    this.musicNames = [
      'village',
      'beach',
      'forest',
      'cave',
      'desert',
      'lavaland',
      'boss',
    ];
    this.soundNames = [
      'loot',
      'hit1',
      'hit2',
      'hurt',
      'heal',
      'chat',
      'revive',
      'death',
      'firefox',
      'achievement',
      'kill1',
      'kill2',
      'noloot',
      'teleport',
      'chest',
      'npc',
      'npc-end',
    ];

    function loadMusicFiles() {
      if (!self.game.renderer.mobile) { // disable music on mobile devices
        log.info('Loading music files...');
        // Load the village music first, as players always start here
        self.loadMusic(self.musicNames.shift(), () => {
          // Then, load all the other music files
          _.each(self.musicNames, name => {
            self.loadMusic(name);
          });
        });
      }
    }

    function loadSoundFiles() {
      let counter = _.size(self.soundNames);
      log.info('Loading sound files...');
      _.each(self.soundNames, name => {
        self.loadSound(name, () => {
          counter -= 1;
          if (counter === 0) {
            if (!Detect.isSafari()) { // Disable music on Safari - See bug 738008
              loadMusicFiles();
            }
          }
        });
      });
    }

    if (!(Detect.isSafari() && Detect.isWindows())) {
      loadSoundFiles();
    } else {
      this.enabled = false; // Disable audio on Safari Windows
    }
  }

  toggle() {
    if (this.enabled) {
      this.enabled = false;

      if (this.currentMusic) {
        this.resetMusic(this.currentMusic);
      }
    } else {
      this.enabled = true;

      if (this.currentMusic) {
        this.currentMusic = null;
      }
      this.updateMusic();
    }
  }

  load(basePath, name, loadedCallback, channels) {
    const path = `${basePath}${name}.${this.extension}`;
    const sound = document.createElement('audio');
    const self = this;

    // todo Fix this
    sound.addEventListener('canplaythrough', function (e, ...arguments) {
      this.removeEventListener('canplaythrough', arguments.callee, false);
      log.debug(`${path} is ready to play.`);
      if (loadedCallback) {
        loadedCallback();
      }
    }, false);
    sound.addEventListener('error', () => {
      log.error(`Error: ${path} could not be loaded.`);
      self.sounds[name] = null;
    }, false);

    sound.preload = 'auto';
    sound.autobuffer = true;
    sound.src = path;
    sound.load();

    this.sounds[name] = [sound];
    _.times(channels - 1, () => {
      self.sounds[name].push(sound.cloneNode(true));
    });
  }

  loadSound(name, handleLoaded) {
    this.load('audio/sounds/', name, handleLoaded, 4);
  }

  loadMusic(name, handleLoaded) {
    this.load('audio/music/', name, handleLoaded, 1);
    const music = this.sounds[name][0];
    music.loop = true;
    music.addEventListener('ended', () => {
      music.play()
    }, false);
  }

  getSound(name) {
    if (!this.sounds[name]) {
      return null;
    }
    let sound = _.find(this.sounds[name], sound => sound.ended || sound.paused);
    if (sound && sound.ended) {
      sound.currentTime = 0;
    } else {
      sound = this.sounds[name][0];
    }
    return sound;
  }

  playSound(name) {
    const sound = this.enabled && this.getSound(name);
    if (sound) {
      sound.play();
    }
  }

  addArea(x, y, width, height, musicName) {
    const area = new Area(x, y, width, height);
    area.musicName = musicName;
    this.areas.push(area);
  }

  getSurroundingMusic(entity) {
    let music = null;
    const area = _.find(this.areas, area => area.contains(entity));

    if (area) {
      music = { sound: this.getSound(area.musicName), name: area.musicName };
    }
    return music;
  }

  updateMusic() {
    if (this.enabled) {
      const music = this.getSurroundingMusic(this.game.player);

      if (music) {
        if (!this.isCurrentMusic(music)) {
          if (this.currentMusic) {
            this.fadeOutCurrentMusic();
          }
          this.playMusic(music);
        }
      } else {
        this.fadeOutCurrentMusic();
      }
    }
  }

  isCurrentMusic(music) {
    return this.currentMusic && (music.name === this.currentMusic.name);
  }

  playMusic(music) {
    if (this.enabled && music && music.sound) {
      if (music.sound.fadingOut) {
        this.fadeInMusic(music);
      } else {
        music.sound.volume = 1;
        music.sound.play();
      }
      this.currentMusic = music;
    }
  }

  resetMusic(music) {
    if (music && music.sound && music.sound.readyState > 0) {
      music.sound.pause();
      music.sound.currentTime = 0;
    }
  }

  fadeOutMusic(music, ended_callback) {
    const self = this;
    if (music && !music.sound.fadingOut) {
      this.clearFadeIn(music);
      music.sound.fadingOut = setInterval(() => {
        const step = 0.02;
        volume = music.sound.volume - step;

        if (self.enabled && volume >= step) {
          music.sound.volume = volume;
        } else {
          music.sound.volume = 0;
          self.clearFadeOut(music);
          ended_callback(music);
        }
      }, 50);
    }
  }

  fadeInMusic(music) {
    const self = this;
    if (music && !music.sound.fadingIn) {
      this.clearFadeOut(music);
      music.sound.fadingIn = setInterval(() => {
        const step = 0.01;
        volume = music.sound.volume + step;

        if (self.enabled && volume < 1 - step) {
          music.sound.volume = volume;
        } else {
          music.sound.volume = 1;
          self.clearFadeIn(music);
        }
      }, 30);
    }
  }

  clearFadeOut(music) {
    if (music.sound.fadingOut) {
      clearInterval(music.sound.fadingOut);
      music.sound.fadingOut = null;
    }
  }

  clearFadeIn(music) {
    if (music.sound.fadingIn) {
      clearInterval(music.sound.fadingIn);
      music.sound.fadingIn = null;
    }
  }

  fadeOutCurrentMusic() {
    const self = this;
    if (this.currentMusic) {
      this.fadeOutMusic(this.currentMusic, music => {
        self.resetMusic(music);
      });
      this.currentMusic = null;
    }
  }
}

export default AudioManager;

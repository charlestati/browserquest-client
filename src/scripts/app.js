import $ from 'jquery';
import log from 'log';
import _ from 'lodash';
import Storage from './storage';

class App {
  constructor() {
    this.currentPage = 1;
    this.blinkInterval = null;
    this.previousState = null;
    this.isParchmentReady = true;
    this.ready = false;
    this.storage = new Storage();
    this.watchNameInputInterval = setInterval(this.toggleButton.bind(this), 100);
    this.$playButton = $('.play');
    this.$playDiv = $('.play div');
    this.transitionEnd = 'transitionend webkitTransitionEnd oTransitionEnd';
  }

  setGame(game) {
    this.game = game;
    this.isMobile = this.game.renderer.mobile;
    this.isTablet = this.game.renderer.tablet;
    this.isDesktop = !(this.isMobile || this.isTablet);
    this.supportsWorkers = !!window.Worker;
    this.ready = true;
  }

  center() {
    window.scrollTo(0, 1);
  }

  canStartGame() {
    if (this.isDesktop) {
      return (this.game && this.game.map && this.game.map.isLoaded);
    }
    return this.game;
  }

  tryStartingGame(username, startingCallback) {
    const self = this;
    const $play = this.$playButton;

    if (username !== '') {
      if (!this.ready || !this.canStartGame()) {
        if (!this.isMobile) {
          // on desktop and tablets, add a spinner to the play button
          $play.addClass('loading');
        }
        this.$playDiv.unbind('click');
        const watchCanStart = setInterval(() => {
          log.debug('waiting...');
          if (self.canStartGame()) {
            setTimeout(() => {
              if (!self.isMobile) {
                $play.removeClass('loading');
              }
            }, 1500);
            clearInterval(watchCanStart);
            self.startGame(username, startingCallback);
          }
        }, 100);
      } else {
        this.$playDiv.unbind('click');
        this.startGame(username, startingCallback);
      }
    }
  }

  startGame(username, startingCallback) {
    const self = this;

    if (startingCallback) {
      startingCallback();
    }
    this.hideIntro(() => {
      if (!self.isDesktop) {
        // On mobile and tablet we load the map after the player has clicked
        // on the PLAY button instead of loading it in a web worker.
        self.game.loadMap();
      }
      self.start(username);
    });
  }

  start(username) {
    const self = this;
    const firstTimePlaying = !self.storage.hasAlreadyPlayed();

    if (username && !this.game.started) {
      let optionsSet = false;
      const config = this.config;

      // todo Do the connection elsewhere
      if (config.local) {
        log.debug('Starting game with local dev config.');
        this.game.setServerOptions(config.local.host, config.local.port, username);
      } else {
        log.debug('Starting game with default dev config.');
        this.game.setServerOptions(config.dev.host, config.dev.port, username);
      }
      optionsSet = true;

      if (!optionsSet) {
        log.debug('Starting game with build config.');
        this.game.setServerOptions(config.build.host, config.build.port, username);
      }

      this.center();
      this.game.run(() => {
        $('body').addClass('started');
        if (firstTimePlaying) {
          self.toggleInstructions();
        }
      });
    }
  }

  setMouseCoordinates(event) {
    const gamePos = $('#container').offset();
    const scale = this.game.renderer.getScaleFactor();
    const width = this.game.renderer.getWidth();
    const height = this.game.renderer.getHeight();
    const mouse = this.game.mouse;

    mouse.x = event.pageX - gamePos.left - (this.isMobile ? 0 : 5 * scale);
    mouse.y = event.pageY - gamePos.top - (this.isMobile ? 0 : 7 * scale);

    if (mouse.x <= 0) {
      mouse.x = 0;
    } else if (mouse.x >= width) {
      mouse.x = width - 1;
    }

    if (mouse.y <= 0) {
      mouse.y = 0;
    } else if (mouse.y >= height) {
      mouse.y = height - 1;
    }
  }

  initHealthBar() {
    const scale = this.game.renderer.getScaleFactor();
    const healthMaxWidth = $('#healthbar').width() - (12 * scale);

    this.game.onPlayerHealthChange((hp, maxHp) => {
      const barWidth = Math.round((healthMaxWidth / maxHp) * (hp > 0 ? hp : 0));
      $('#hitpoints').css('width', `${barWidth}px`);
    });

    this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
  }

  blinkHealthBar() {
    const $hitpoints = $('#hitpoints');

    $hitpoints.addClass('white');
    setTimeout(() => {
      $hitpoints.removeClass('white');
    }, 500);
  }

  toggleButton() {
    const name = $('#parchment input').val();
    const $play = $('#createcharacter .play');

    if (name && name.length > 0) {
      $play.removeClass('disabled');
      $('#character').removeClass('disabled');
    } else {
      $play.addClass('disabled');
      $('#character').addClass('disabled');
    }
  }

  hideIntro(hiddenCallback) {
    clearInterval(this.watchNameInputInterval);
    $('body').removeClass('intro');
    setTimeout(() => {
      $('body').addClass('game');
      hiddenCallback();
    }, 1000);
  }

  showChat() {
    if (this.game.started) {
      $('#chatbox').addClass('active');
      $('#chatinput').focus();
      $('#chatbutton').addClass('active');
    }
  }

  hideChat() {
    if (this.game.started) {
      $('#chatbox').removeClass('active');
      $('#chatinput').blur();
      $('#chatbutton').removeClass('active');
    }
  }

  toggleInstructions() {
    if ($('#achievements').hasClass('active')) {
      this.toggleAchievements();
      $('#achievementsbutton').removeClass('active');
    }
    $('#instructions').toggleClass('active');
  }

  toggleAchievements() {
    if ($('#instructions').hasClass('active')) {
      this.toggleInstructions();
      $('#helpbutton').removeClass('active');
    }
    this.resetPage();
    $('#achievements').toggleClass('active');
  }

  resetPage() {
    const self = this;
    const $achievements = $('#achievements');

    if ($achievements.hasClass('active')) {
      $achievements.bind(this.transitionEnd, () => {
        $achievements.removeClass(`page${self.currentPage}`).addClass('page1');
        self.currentPage = 1;
        $achievements.unbind(this.transitionEnd);
      });
    }
  }

  initEquipmentIcons() {
    const scale = this.game.renderer.getScaleFactor();
    const getIconPath = spriteName => `images/${scale}/item-${spriteName}.png`;
    const weapon = this.game.player.getWeaponName();
    const armor = this.game.player.getSpriteName();
    const weaponPath = getIconPath(weapon);
    const armorPath = getIconPath(armor);

    $('#weapon').css('background-image', `url('${weaponPath}')`);
    if (armor !== 'firefox') {
      $('#armor').css('background-image', `url('${armorPath}')`);
    }
  }

  hideWindows() {
    if ($('#achievements').hasClass('active')) {
      this.toggleAchievements();
      $('#achievementsbutton').removeClass('active');
    }
    if ($('#instructions').hasClass('active')) {
      this.toggleInstructions();
      $('#helpbutton').removeClass('active');
    }
    if ($('body').hasClass('credits')) {
      this.closeInGameCredits();
    }
    if ($('body').hasClass('about')) {
      this.closeInGameAbout();
    }
  }

  showAchievementNotification(id, name) {
    const $notif = $('#achievement-notification');
    const $name = $notif.find('.name');
    const $button = $('#achievementsbutton');

    $notif.removeClass().addClass(`active achievement${id}`);
    $name.text(name);
    if (this.game.storage.getAchievementCount() === 1) {
      this.blinkInterval = setInterval(() => {
        $button.toggleClass('blink');
      }, 500);
    }
    setTimeout(() => {
      $notif.removeClass('active');
      $button.removeClass('blink');
    }, 5000);
  }

  displayUnlockedAchievement(id) {
    const $achievement = $(`#achievements li.achievement${id}`);

    const achievement = this.game.getAchievementById(id);
    if (achievement && achievement.hidden) {
      this.setAchievementData($achievement, achievement.name, achievement.desc);
    }
    $achievement.addClass('unlocked');
  }

  unlockAchievement(id, name) {
    this.showAchievementNotification(id, name);
    this.displayUnlockedAchievement(id);

    const nb = parseInt($('#unlocked-achievements').text(), 10);
    $('#unlocked-achievements').text(nb + 1);
  }

  initAchievementList(achievements) {
    const self = this;
    const $lists = $('#lists');
    const $page = $('#page-tmpl');
    const $achievement = $('#achievement-tmpl');
    let page = 0;
    let count = 0;
    let $p = null;

    _.each(achievements, achievement => {
      count++;

      const $a = $achievement.clone();
      $a.removeAttr('id');
      $a.addClass(`achievement${count}`);
      if (!achievement.hidden) {
        self.setAchievementData($a, achievement.name, achievement.desc);
      }
      $a.find('.twitter').attr(
        'href',
        `http://twitter.com/share?url=http%3A%2F%2Fbrowserquest.mozilla.org&text=
        I%20unlocked%20the%20%27${achievement.name}%27%20achievement%20on%20Mozilla
        %27s%20%23BrowserQuest%21&related=glecollinet:Creators%20of%20BrowserQuest%2Cwhatthefranck`
      );
      $a.show();
      $a.find('a').click(function () {
        const url = $(this).attr('href');

        self.openPopup('twitter', url);
        return false;
      });

      if ((count - 1) % 4 === 0) {
        page++;
        $p = $page.clone();
        $p.attr('id', `page${page}`);
        $p.show();
        $lists.append($p);
      }
      $p.append($a);
    });

    $('#total-achievements').text($('#achievements').find('li').length);
  }

  initUnlockedAchievements(ids) {
    const self = this;

    _.each(ids, id => {
      self.displayUnlockedAchievement(id);
    });
    $('#unlocked-achievements').text(ids.length);
  }

  setAchievementData($el, name, desc) {
    $el.find('.achievement-name').html(name);
    $el.find('.achievement-description').html(desc);
  }

  toggleCredits() {
    const currentState = $('#parchment').attr('class');

    if (this.game.started) {
      $('#parchment').removeClass().addClass('credits');

      $('body').toggleClass('credits');

      if (!this.game.player) {
        $('body').toggleClass('death');
      }
      if ($('body').hasClass('about')) {
        this.closeInGameAbout();
        $('#helpbutton').removeClass('active');
      }
    } else {
      if (currentState !== 'animate') {
        if (currentState === 'credits') {
          this.animateParchment(currentState, this.previousState);
        } else {
          this.animateParchment(currentState, 'credits');
          this.previousState = currentState;
        }
      }
    }
  }

  toggleAbout() {
    const currentState = $('#parchment').attr('class');

    if (this.game.started) {
      $('#parchment').removeClass().addClass('about');
      $('body').toggleClass('about');
      if (!this.game.player) {
        $('body').toggleClass('death');
      }
      if ($('body').hasClass('credits')) {
        this.closeInGameCredits();
      }
    } else {
      if (currentState !== 'animate') {
        if (currentState === 'about') {
          if (localStorage && localStorage.data) {
            this.animateParchment(currentState, 'loadcharacter');
          } else {
            this.animateParchment(currentState, 'createcharacter');
          }
        } else {
          this.animateParchment(currentState, 'about');
          this.previousState = currentState;
        }
      }
    }
  }

  closeInGameCredits() {
    $('body').removeClass('credits');
    $('#parchment').removeClass('credits');
    if (!this.game.player) {
      $('body').addClass('death');
    }
  }

  closeInGameAbout() {
    $('body').removeClass('about');
    $('#parchment').removeClass('about');
    if (!this.game.player) {
      $('body').addClass('death');
    }
    $('#helpbutton').removeClass('active');
  }

  togglePopulationInfo() {
    $('#population').toggleClass('visible');
  }

  openPopup(type, url) {
    const h = $(window).height();
    const w = $(window).width();
    let popupHeight;
    let popupWidth;

    switch (type) {
      case 'twitter':
        popupHeight = 450;
        popupWidth = 550;
        break;
      default:
        popupHeight = 400;
        popupWidth = 580;
        break;
    }

    const top = (h / 2) - (popupHeight / 2);
    const left = (w / 2) - (popupWidth / 2);

    const newwindow = window.open(url, 'name', `height=${popupHeight},
    width=${popupWidth},top=${top},left=${left}`);
    if (window.focus) {
      newwindow.focus();
    }
  }

  animateParchment(origin, destination) {
    const self = this;
    const $parchment = $('#parchment');
    let duration = 1;

    if (this.isMobile) {
      $parchment.removeClass(origin).addClass(destination);
    } else {
      if (this.isParchmentReady) {
        if (this.isTablet) {
          duration = 0;
        }
        this.isParchmentReady = !this.isParchmentReady;

        $parchment.toggleClass('animate');
        $parchment.removeClass(origin);

        setTimeout(() => {
          $('#parchment').toggleClass('animate');
          $parchment.addClass(destination);
        }, duration * 1000);

        setTimeout(() => {
          self.isParchmentReady = !self.isParchmentReady;
        }, duration * 1000);
      }
    }
  }

  animateMessages() {
    const $messages = $('#notifications div');

    $messages.addClass('top');
  }

  resetMessagesPosition() {
    const message = $('#message2').text();

    $('#notifications div').removeClass('top');
    $('#message2').text('');
    $('#message1').text(message);
  }

  showMessage(message) {
    const $wrapper = $('#notifications div');
    const $message = $('#notifications #message2');

    this.animateMessages();
    $message.text(message);
    if (this.messageTimer) {
      this.resetMessageTimer();
    }

    this.messageTimer = setTimeout(() => {
      $wrapper.addClass('top');
    }, 5000);
  }

  resetMessageTimer() {
    clearTimeout(this.messageTimer);
  }

  resizeUi() {
    if (this.game) {
      if (this.game.started) {
        this.game.resize();
        this.initHealthBar();
        this.game.updateBars();
      } else {
        const newScale = this.game.renderer.getScaleFactor();
        this.game.renderer.rescale(newScale);
      }
    }
  }
}

export default App;

import $ from 'jquery';
import log from 'log';
import _ from 'lodash';
import App from './app';
import Game from './game';
import Detect from './detect';

let app;
let game;

function initGame() {
  const canvas = document.getElementById('entities');
  const background = document.getElementById('background');
  const foreground = document.getElementById('foreground');
  const input = document.getElementById('chatinput');

  game = new Game(app);
  game.setup('#bubbles', canvas, background, foreground, input);
  game.setStorage(app.storage);
  app.setGame(game);

  if (app.isDesktop && app.supportsWorkers) {
    game.loadMap();
  }

  game.onGameStart(() => {
    app.initEquipmentIcons();
  });

  game.onDisconnect(message => {
    $('#death').find('p').html(`${message}<em>Please reload the page.</em>`);
    $('#respawn').hide();
  });

  game.onPlayerDeath(() => {
    if ($('body').hasClass('credits')) {
      $('body').removeClass('credits');
    }
    $('body').addClass('death');
  });

  game.onPlayerEquipmentChange(() => {
    app.initEquipmentIcons();
  });

  game.onPlayerInvincible(() => {
    $('#hitpoints').toggleClass('invincible');
  });

  game.onNbPlayersChange((worldPlayers, totalPlayers) => {
    const setWorldPlayersString = string => {
      $('#instance-population').find('span:nth-child(2)').text(string);
      $('#playercount').find('span:nth-child(2)').text(string);
    };
    const setTotalPlayersString = string => {
      $('#world-population').find('span:nth-child(2)').text(string);
    };

    $('#playercount').find('span.count').text(worldPlayers);

    $('#instance-population').find('span').text(worldPlayers);
    if (worldPlayers === 1) {
      setWorldPlayersString('player');
    } else {
      setWorldPlayersString('players');
    }

    $('#world-population').find('span').text(totalPlayers);
    if (totalPlayers === 1) {
      setTotalPlayersString('player');
    } else {
      setTotalPlayersString('players');
    }
  });

  game.onAchievementUnlock((id, name) => {
    app.unlockAchievement(id, name);
  });

  game.onNotification(message => {
    app.showMessage(message);
  });

  app.initHealthBar();

  $('#nameinput').val('');
  $('#chatbox').attr('value', '');

  if (game.renderer.mobile || game.renderer.tablet) {
    $('#foreground').bind('touchstart', event => {
      app.center();
      app.setMouseCoordinates(event.originalEvent.touches[0]);
      game.click();
      app.hideWindows();
    });
  } else {
    $('#foreground').click(event => {
      app.center();
      app.setMouseCoordinates(event);
      if (game) {
        game.click();
      }
      app.hideWindows();
      // $('#chatinput').focus();
    });
  }

  $('body').unbind('click');
  $('body').click(() => {
    let hasClosedParchment = false;

    if ($('#parchment').hasClass('credits')) {
      if (game.started) {
        app.closeInGameCredits();
        hasClosedParchment = true;
      } else {
        app.toggleCredits();
      }
    }

    if ($('#parchment').hasClass('about')) {
      if (game.started) {
        app.closeInGameAbout();
        hasClosedParchment = true;
      } else {
        app.toggleAbout();
      }
    }

    if (game.started && !game.renderer.mobile && game.player && !hasClosedParchment) {
      game.click();
    }
  });

  $('#respawn').click(() => {
    game.audioManager.playSound('revive');
    game.restart();
    $('body').removeClass('death');
  });

  $(document).mousemove(event => {
    app.setMouseCoordinates(event);
    if (game.started) {
      game.movecursor();
    }
  });

  $(document).keydown(e => {
    const key = e.which;

    if (key === 13) {
      if ($('#chatbox').hasClass('active')) {
        app.hideChat();
      } else {
        app.showChat();
      }
    }
  });

  $('#chatinput').keydown(e => {
    const key = e.which;
    const chat = $('#chatinput');

    if (key === 13) {
      if (chat.val().replace(/\s/g, '').length) {
        if (game.player) {
          game.say(chat.val());
        }
        chat.val('');
        app.hideChat();
        $('#foreground').focus();
        return false;
      }
      app.hideChat();
      return false;
    }

    if (key === 27) {
      app.hideChat();
      return false;
    }

    return false;
  });

  $('#nameinput').keypress(event => {
    const $name = $('#nameinput');
    const name = $name.val();

    // todo Make if more efficient (if !==)
    if (event.keyCode === 13) {
      if (name !== '') {
        app.tryStartingGame(name, () => {
          $name.blur(); // exit keyboard on mobile
        });
        return false; // prevent form submit
      }
      return false; // prevent form submit
    }
    return false;
  });

  $('#mutebutton').click(() => {
    game.audioManager.toggle();
  });

  $(document).bind('keydown', e => {
    const key = e.which;
    const $chat = $('#chatinput');

    if ($('#chatinput:focus').size() === 0 && $('#nameinput:focus').size() === 0) {
      if (key === 13) { // Enter
        if (game.ready) {
          $chat.focus();
          return false;
        }
      }
      if (key === 32) { // Space
        // game.togglePathingGrid();
        return false;
      }
      if (key === 70) { // F
        // game.toggleDebugInfo();
        return false;
      }
      if (key === 27) { // ESC
        app.hideWindows();
        _.each(game.player.attackers, attacker => {
          attacker.stop();
        });
        return false;
      }
      if (key === 65) { // a
        // game.player.hit();
        return false;
      }
    } else {
      if (key === 13 && game.ready) {
        $chat.focus();
        return false;
      }
    }
    // todo Make if more efficient (return)
    return false;
  });

  if (game.renderer.tablet) {
    $('body').addClass('tablet');
  }
}

function initApp() {
  $(document).ready(() => {
    app = new App();
    app.center();

    if (Detect.isWindows()) {
      // Workaround for graphical glitches on text
      $('body').addClass('windows');
    }

    if (Detect.isOpera()) {
      // Fix for no pointer events
      $('body').addClass('opera');
    }

    $('body').click(() => {
      if ($('#parchment').hasClass('credits')) {
        app.toggleCredits();
      }

      if ($('#parchment').hasClass('about')) {
        app.toggleAbout();
      }
    });

    $('.barbutton').click(function () {
      $(this).toggleClass('active');
    });

    $('#chatbutton').click(() => {
      if ($('#chatbutton').hasClass('active')) {
        app.showChat();
      } else {
        app.hideChat();
      }
    });

    $('#helpbutton').click(() => {
      app.toggleAbout();
    });

    $('#achievementsbutton').click(function () {
      app.toggleAchievements();
      if (app.blinkInterval) {
        clearInterval(app.blinkInterval);
      }
      $(this).removeClass('blink');
    });

    $('#instructions').click(() => {
      app.hideWindows();
    });

    $('#playercount').click(() => {
      app.togglePopulationInfo();
    });

    $('#population').click(() => {
      app.togglePopulationInfo();
    });

    $('.clickable').click(event => {
      event.stopPropagation();
    });

    $('#toggle-credits').click(() => {
      app.toggleCredits();
    });

    $('#create-new span').click(() => {
      app.animateParchment('loadcharacter', 'confirmation');
    });

    $('.delete').click(() => {
      app.storage.clear();
      app.animateParchment('confirmation', 'createcharacter');
    });

    $('#cancel span').click(() => {
      app.animateParchment('confirmation', 'loadcharacter');
    });

    $('.ribbon').click(() => {
      app.toggleAbout();
    });

    $('#nameinput').bind('keyup', () => {
      app.toggleButton();
    });

    $('#previous').click(() => {
      const $achievements = $('#achievements');
      // todo Make if more efficient (if !==)
      if (app.currentPage === 1) {
        return false;
      }
      app.currentPage -= 1;
      $achievements.removeClass().addClass(`active page${app.currentPage}`);
      return false;
    });

    $('#next').click(() => {
      const $achievements = $('#achievements');
      const $lists = $('#lists');
      const nbPages = $lists.children('ul').length;
      // todo Make if more efficient (if !==)
      if (app.currentPage === nbPages) {
        return false;
      }
      app.currentPage += 1;
      $achievements.removeClass().addClass(`active page${app.currentPage}`);
      return false;
    });

    // todo Check if this works and use .on() instead
    $('#notifications div').bind(app.resetMessagesPosition.bind(app));

    $('.close').click(() => {
      app.hideWindows();
    });

    $('.twitter').click(function () {
      const url = $(this).attr('href');

      app.openPopup('twitter', url);
      return false;
    });

    $('.facebook').click(function () {
      const url = $(this).attr('href');

      app.openPopup('facebook', url);
      return false;
    });

    const data = app.storage.data;
    if (data.hasAlreadyPlayed) {
      if (data.player.name && data.player.name !== '') {
        $('#playername').html(data.player.name);
        $('#playerimage').attr('src', data.player.image);
      }
    }

    $('.play div').click(() => {
      const nameFromInput = $('#nameinput').val();
      const nameFromStorage = $('#playername').html();
      const name = nameFromInput || nameFromStorage;

      app.tryStartingGame(name);
    });

    document.addEventListener('touchstart', () => {
    }, false);

    $('#resize-check').bind('transitionend', app.resizeUi.bind(app));
    $('#resize-check').bind('webkitTransitionEnd', app.resizeUi.bind(app));
    $('#resize-check').bind('oTransitionEnd', app.resizeUi.bind(app));

    log.info('App initialized.');

    initGame();
  });
}

initApp();

// todo Find another way
Function.prototype.bind = (bind) => {
  const self = this;
  return () => {
    const args = Array.prototype.slice.call(arguments);
    return self.apply(bind || null, args);
  };
};

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = ((() => window.requestAnimationFrame ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame ||
window.msRequestAnimationFrame ||
((callback) => {
  window.setTimeout(callback, 1000 / 60);
})))();

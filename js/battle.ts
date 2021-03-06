/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class BattleEffectEvent extends createjs.Event {
    kind: string;
    magnitude: number;
    reflected: boolean; // not in use currently
  }

  /**
   * Base class of enemies.
   */
  export class Enemy extends DomDisplayObject {
    public name: string;
    public maxHP: number;
    public HP: number;
    public ATK: number;
    public EXP: number;
    public attribute: string;
    public patterns: EnemyPattern[] = [];
    public startTalk: string;

    private update() {
      var e = this.element;
      $('.enemy_name', e).text(this.name);
      $('.attribute', e).addClass(this.attribute);
      $('.enemy_hp_value', e).text(this.HP);
      $('.enemy_hp_bar', e).css('width', this.HP / this.maxHP * 100 + '%');
    }

    public hit(damage: number): void {
      this.HP = Math.max(this.HP - damage, 0);
      this.update();
      this.dispatchEvent('hpChange');
      this.element
        .transition({ y: -20 }, 350)
        .transition({ y: 0 }, 650, 'ease', () => {
          this.hitEffectEnd(damage);
        });
    }

    private hitEffectEnd(damage: number) {
      if (this.HP <= 0) {
        this.element.animate({ opacity: 0 }, 1000, () => {
          this.die();
        });
      } else {
        setTimeout(() => this.myTurn(), 1000);
      }
    }

    /**
     * Parse 'turn' parameter.
     */
    private checkTurn(turnStr: string): boolean {
      var tokens = turnStr.trim().split(/\s+/);
      var i: number, m: any;
      for (i = 0; i < tokens.length; i++) {
        var tok = tokens[i];
        if (tok.match(/^\d+$/)) {
          // exact turn count
          if (game.battle.turn != parseInt(tok)) return false;
        } else if (m = tok.match(/^(\d+)%$/)) {
          // probability
          if (Math.random() > (m[1] / 100)) return false;
        } else if (m = tok.match(/^(\d+)n(\+(\d+))?$/)) {
          // even, odd, etc.
          var mod = m[3] ? parseInt(m[3]) : 0;
          var div = parseInt(m[1]);
          if (game.battle.turn % div != mod) return false;
        } else if (m = tok.match(/^(HP)?([><]=?)(\d+)$/i)) {
          // compare with turn or HP
          var left = m[1] ? this.HP : game.battle.turn;
          if (!eval(left + m[2] + m[3])) return false;
        } else {
          throw 'invalid token ' + tok;
        }
      }
      return true;
    }

    private determineNextAction(): EnemyPattern {
      var result: EnemyPattern = { action: 'AttackAction' };
      if (game.battle.turn == 0) result = { action: 'NullAction' };
      this.patterns.some(pat => {
        if (this.checkTurn(pat.turn.toString())) {
          result = pat;
          return true;
        }
      });
      return result;
    }

    private myTurn(): void {
      var nextAction = this.determineNextAction();
      var action = new (battles[nextAction.action])(this, nextAction);

      if (nextAction.notify) new Notification(nextAction.notify);
      if (nextAction.say) new Balloon(nextAction.say);

      action.invoke(() => this.endMyTurn());
    }

    private endMyTurn() {
      this.dispatchEvent('enemyTurnEnd');
    }

    private die(): void {
      game.console.log(this.name + 'は倒れた');
      this.dispatchEvent('enemyTurnEnd');
    }

    private resolveEnemyInfoInheritance(id: string): EnemyInfo {
      var enemies = application.settings.enemies;
      var info = enemies[id];
      if (typeof info == 'undefined') {
        throw 'No  enemy ID ' + id;
      }
      if (info.inherits) {
        return $.extend({}, this.resolveEnemyInfoInheritance(info.inherits), info);
      } else {
        return info;
      }
    }

    constructor(id: string) {
      super('enemy');
      var e = this.resolveEnemyInfoInheritance(id);
      this.element.find('.enemy_image').attr('src', 'images/enemies/' + e.image);
      this.startTalk = e.startTalk;
      this.name = e.name;
      this.HP = e.HP;
      this.maxHP = e.HP;
      this.ATK = e.ATK;
      this.EXP = e.EXP;
      this.attribute = e.attribute ? e.attribute : 'non';
      if (e.patterns) this.patterns = e.patterns;
      this.update();
    }
  }

  export interface FlyTextOptions {
    text: string;
    parent: any;
    callback?: () => void;
    duration?: number;
    transition?: Object;
    class?: string;
  }

  /**
   * Flying text effect that shows damage value, etc.
   */
  export class FlyText extends DomDisplayObject {

    constructor(options: FlyTextOptions);
    constructor(text: string, parent: JQuery, callback: () => void);
    constructor(text: string, parent: JQuery);
    constructor(opt: any, ...args) {
      if (typeof opt == 'string') {
        opt = {
          text: opt
        };
        args.forEach(arg => {
          if (typeof arg == 'function') opt.callback = arg;
          else if (arg instanceof jQuery) opt.parent = arg;
        });
      }
      if (!('transition' in opt)) opt.transition = {
        y: -20,
        opacity: 0
      };
      if (!('duration' in opt)) opt.duration = 1200;
      if (!('easing' in opt)) opt.easing = 'easeInQuad';

      super('flytext');
      if ('class' in opt) this.element.addClass(opt.class);

      this.element.text(opt.text).appendTo(opt.parent);
      this.element.position({
        of: opt.parent
      });
      var from = this.element.position().top;
      this.element.transition(opt.transition, opt.duration, opt.easing, () => {
        if ('callback' in opt) opt.callback();
        this.element.remove();
      });
    }
  }

  export class Notification extends DomDisplayObject {
    constructor(message: string, callback?: () => void) {
      super('notification');
      this.element
        .text(message)
        .appendTo(game.battle.element)
        .position({ of: game.battle.enemy.element })
        .css({ opacity: 0 })
        .transition({ opacity: 1, duration: 200 })
        .transition({ opacity: 1, duration: 1500 })
        .transition({
          opacity: 0,
          duration: 200,
          complete: () => {
            this.element.remove();
            callback && callback();
          }
        });
    }
  }

  export class Balloon extends DomDisplayObject {
    constructor(message: string, callback?: () => void) {
      super('balloon');
      this.element
        .text(message)
        .appendTo(game.battle.element)
        .position({ of: game.battle.enemy.element, my: 'left', at: 'right' })
        .css({ opacity: 0 })
        .transition({ opacity: 1, duration: 200 })
        .transition({ opacity: 1, duration: 2500 })
        .transition({
          opacity: 0,
          duration: 200,
          complete: () => {
            this.element.remove();
            callback && callback();
          }
        });
    }
  }
  
  /**
   * Attack effect, displayed for a short time and destroied by themselves automatically.
   */
  class AttackEffect extends createjs.Sprite {
    static spriteSheet: createjs.SpriteSheet = new createjs.SpriteSheet({
      framerate: 10,
      images: ["images/attack_effects.png"],
      frames: { width: 100, height: 100, count: 40, regX: 50, regY: 50 },
      animations: {
        cute: [0, 9],
        cool: [10, 19],
        passion: [20, 29],
        non: [30, 39]
      }
    });

    private animationEnd(event) {
      this.parent.removeChild(this);
    }

    constructor() {
      super(AttackEffect.spriteSheet);
      this.on('animationend', this.animationEnd, this);
      this.compositeOperation = 'lighter';
    }
  }

  /**
   * Main manager class for battles.
   */
  export class Battle extends StatusClient {
    public enemy: Enemy;
    private _turn: number;
    private _onboard_area: JQuery;
    private _selected_dice: Dice;
    private _queue: { modifier: cgdice.characters.AttackModifier; player: cgdice.characters.Character; }[];
    private _attacks: number[];
    private _attack_all: number;

    get onboard(): number[] {
      return $('.dice', this._onboard_area).map((i, d) => (<Dice>$(d).data('self')).pips).get();
    }

    get turn(): number { return this._turn; }

    public start(enemyID: string, talkID?: string) {
      this.enemy = new Enemy(enemyID);
      $('#enemies', this.element).empty();
      this.enemy.element.appendTo('#enemies');
      this.enemy.on('enemyAttack', this.enemyAttacked, this);
      this.enemy.on('enemyTurnEnd', this.enemyTurnEnd, this);

      this._turn = 0;

      this.dispatchEvent('initialized');
      this.startAlliesTurn();
      this.element.show();
      if (talkID) {
        Talk.show(talkID, () => {
          if (this.enemy.startTalk) new Balloon(this.enemy.startTalk);
          new GamePhaseMessage('battle_start');
        });
      } else {
        if (this.enemy.startTalk) new Balloon(this.enemy.startTalk);
        new GamePhaseMessage('battle_start');
      }
    }

    public diceChanged() {
      if (game.phase != GamePhase.InBattle) return;
      game.players.forEach((c) => {
        c.highlightMultipliers(this.onboard, game.stack.getNumbers());
      });
    }

    public shuffleOnboardDice() {
      var i = 0;
      this._onboard_area.empty();
      for (i = 0; i <= 1; i++) {
        var dice = new Dice();
        dice.element.appendTo(this._onboard_area);
        dice.roll();
      }
      new DicePlaceholder().element.appendTo(this._onboard_area);
    }

    public addOnboardDice(num: number = 1) {
      for (var i = 0; i < num; i++) {
        var dice = new Dice();
        dice.element.appendTo(this._onboard_area);
        dice.roll();
      }
      this._onboard_area.find('.dice_placeholder')
        .detach()
        .appendTo(this._onboard_area); // move to last
    }

    private diceDetermined(event: DiceEvent) {
      // dice animation
      this._selected_dice = event.dice;

      var dice = event.dice;
      var to = this._onboard_area.find('.dice_placeholder');
      dice.element.addClass('detached_dice');
      event.dice.element
        .css({ position: 'absolute' })
        .appendTo(this.element)
        .position({ of: to });

      dice.element
        .stop(true)
        .transition({
          rotate: 360,
          scale: 1.5,
        }, 400)
        .transition({
          scale: 1
        }, 1000);

      var pips = dice.pips;
      var all_pips: number[] = this.onboard.slice();
      all_pips.push(pips);

      this._attack_all = 0;
      this._queue = [];
      this._attacks = [];

      game.players.forEach((player, idx) => {
        player.resetHighlight();
        player.highlightMultipliers(all_pips, []);
        var attack_power = player.attackPower(all_pips);
        this._attacks[idx] = attack_power.ATK;

        // attack power grand total
        this._attack_all += attack_power.ATK;

        attack_power.modifiers.forEach((modifier, idx) => {
          if (idx == 0) {
            player.element.find('.current_attack')
              .text(modifier.ATK)
              .css({ scale: 1.5 })
              .transition({ scale: 1, duration: 500 });
          } else {
            this._queue.push({
              player: player,
              modifier: modifier
            });
          }
        });
      });

      setTimeout(() => this.playAttackAnimation(), 500);
    }

    private playAttackAnimation() {
      if (this._queue.length > 0) {
        // play next
        var next = this._queue.shift();
        new FlyText({
          text: next.modifier.caption,
          parent: next.player.element,
          class: 'modify_caption',
          transition: { y: -40, opacity: 0.8, easing: 'out' }
        });
        next.player.element.find('.current_attack')
          .text(next.modifier.ATK.toString())
          .css({ scale: 1.5 })
          .transition({ scale: 1, duration: 500 }, () => this.playAttackAnimation());
      } else {
        // attack effect animation
        game.players.forEach((player, idx) => {
          var ae = new AttackEffect();
          var en = this.enemy.element;
          ae.x = (this.element.width() - en.width()) / 2 +  Math.random() * en.width();
          ae.y = Math.random() * this.enemy.element.height();
          ae.framerate = Math.min(Math.max(8, 1000 / this._attacks[idx]), 20);
          ae.scaleX = ae.scaleY = Math.min(Math.max(1, this._attacks[idx] / 10), 8);
          setTimeout(() => {
            this.stage.addChild(ae);
            ae.gotoAndPlay(player.attribute);
            player.element
              .transition({ y: -10, duration: 100 })
              .transition({ y: 0, duration: 200 });
          }, Math.floor(Math.random() * 500));
        });

        // all attack fly text
        new FlyText({
          text: this._attack_all.toString(),
          parent: this.element,
          class: 'all_attack'
        });

        // enemy hit
        this.enemy.hit(this._attack_all);
      }
    }

    private diceHovered(event: DiceEvent) {
      //
    }

    private diceUnhovered(event: DiceEvent) {
      //
    }

    private enemyTurnEnd() {
      game.players.forEach(p => p.resetHighlight());
      this.dispatchEvent('turnEnd');
      if (this.enemy.HP <= 0) {
        // Win!
        new GamePhaseMessage('battle_win', 1500, () => {
          if (game.field.position != game.field.blocks.length - 1) {
            this.element.hide();
          }
          game.gainExp += this.enemy.EXP;
          this.dispatchEvent('battleFinish');
          this.dispatchEvent('diceProcess');
        });
      } else {
        this.startAlliesTurn();
      }
    }

    private startAlliesTurn() {
      this._turn++;
      this.element.find('.detached_dice').remove();
      this.dispatchEvent('diceProcess');
      this.shuffleOnboardDice();
      this.diceChanged();
    }

    public enemyAttacked(event: BattleEffectEvent) {
      game.console.log(event.magnitude + 'の攻撃を受けた');

      var current = event.magnitude;

      var modifiers = this.findStatus(StatusType.DamageMultiply);
      modifiers.forEach(mod => {
        var scale = mod.options.scale;
        var before = current;
        current = Math.ceil(current * scale);
        if (current < before) {
          new FlyText((before - current) + 'ダメージ軽減!', this.element);
        }
      });

      game.getDamage(current);
    }

    constructor() {
      super($('#battle'));
      this.on('diceDetermine', this.diceDetermined, this);
      this.on('diceHover', this.diceHovered, this);
      this.on('diceUnhover', this.diceUnhovered, this);
      this._onboard_area = this.element.find('#onboard');
      this.useCanvas();
      this.element.find('#onboard_container').appendTo(this.element); // move in front of canvas
    }

  }
}
/// <reference path="displayobject.ts" />
/// <reference path="game.ts" />

module cgdice.battles {
  export class BattleEffectEvent extends createjs.Event {
    kind: string;
    magnitude: number;
    reflected: boolean; // not in use currently
  }

  export class Enemy extends cgdice.DomDisplayObject {
    public name: string;
    public maxHP: number;
    public HP: number;
    public ATK: number;
    public EXP: number;

    private update() {
      var e = this.element;
      $('.enemy_name', e).text(this.name);
      $('.enemy_hp_value', e).text(this.HP);
      $('.enemy_hp_bar', e).css('width', this.HP / this.maxHP * 100 + '%');
    }

    public hit(damage: number): void {
      this.element
        .transition({ y: 15 }, 150)
        .transition({ y: 0 }, 150, 'ease', () => {
          this.hitEffectEnd(damage);
        });
    }

    private hitEffectEnd(damage: number) {
      this.HP = Math.max(this.HP - damage, 0);
      this.update();
      this.dispatchEvent('hpChange');
      if (this.HP <= 0) {
        this.element.animate({ opacity: 0 }, 1000, () => {
          this.die();
        });
      } else {
        this.myTurn();
      }
    }

    private myTurn(): void {
      var power: number = Math.floor(Math.random() * this.ATK) + 1;
      game.console.log(this.name + 'から' + power + 'の攻撃!');

      new FlyText({
        text: power.toString(),
        parent: this.element,
        class: 'enemy_attack'
      });
      this.element.transition(
        { scale: 1.1 },
        500,
        'ease',
        () => {
          this.element.transition({ scale: 1 });
          var event = new BattleEffectEvent('enemyAttack', false, false);
          event.kind = 'physicalAttack';
          event.magnitude = power;
          this.dispatchEvent(event);
          this.dispatchEvent('enemyTurnEnd');
        }
        );
    }

    private die(): void {
      game.console.log(this.name + 'は倒れた');
      this.dispatchEvent('enemyTurnEnd');
    }

    constructor(id: string) {
      super('enemy');
      var data = application.loader.getResult('enemies');
      if (!(id in data)) { alert('Runtime Error: no such enemy ID'); }
      var e = data[id];
      this.element.find('.enemy_image').attr('src', 'images/' + e.image);
      this.name = e.name;
      this.HP = e.HP;
      this.maxHP = e.HP;
      this.ATK = e.ATK;
      this.EXP = e.EXP;
      this.update();
    }
  }

  interface FlyTextOptions {
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
  class FlyText extends cgdice.DomDisplayObject {

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

  export class Battle extends StatusClient {
    public enemy: Enemy;
    public onboard: number[];
    private _onboard_area: JQuery;
    private _selected_dice: Dice;
    private _queue: { modifier: cgdice.characters.AttackModifier; player: cgdice.characters.Character; }[];
    private _attacks: number[];
    private _attack_all: number;

    public start() {
      this.enemy = new Enemy('chihiro');
      $('#enemies', this.element).empty();
      this.enemy.element.appendTo('#enemies');
      this.enemy.on('enemyAttack', this.enemyAttacked, this);
      this.enemy.on('enemyTurnEnd', this.enemyTurnEnd, this);
      this.dispatchEvent('initialized');
      this.shuffleOnboardDice();
      this.element.show();
    }

    public diceChanged() {
      game.players.forEach((c) => {
        c.highlightMultipliers(this.onboard, game.stack.getNumbers());
      });
    }

    public shuffleOnboardDice() {
      var i = 0;
      this.onboard = [];
      this._onboard_area.empty();
      for (i = 0; i <= 1; i++) {
        var dice = new cgdice.Dice();
        dice.element.appendTo(this._onboard_area);
        dice.roll();
        this.onboard.push(dice.pips);
      }
      new DicePlaceholder().element.appendTo(this._onboard_area);
      this.diceChanged();
    }

    public addOnboardDice(num: number = 1) {
      for (var i = 0; i < num; i++) {
        var dice = new cgdice.Dice();
        dice.element.appendTo(this._onboard_area);
        dice.roll();
        this.onboard.push(dice.pips);
      }
      this._onboard_area.find('.placeholder')
        .detach()
        .appendTo(this._onboard_area); // move to last
      this.diceChanged();
    }

    private diceDetermined(event: DiceEvent) {
      // dice animation
      this._selected_dice = event.dice;

      var dice = event.dice;
      var to = this._onboard_area.find('.placeholder');
      event.dice.element
        .css({ position: 'absolute' })
        .appendTo(this._onboard_area)
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
        var next = this._queue.shift();
        new FlyText({
          text: next.modifier.caption,
          parent: next.player.element,
          class: 'modify_caption',
          transition: { y: -30, opacity: 0.8, easing: 'out' }
        });
        next.player.element.find('.current_attack')
          .text(next.modifier.ATK.toString())
          .css({ scale: 1.5 })
          .transition({ scale: 1, duration: 500 }, () => this.playAttackAnimation());
      } else {
        // attack effect animation
        game.players.forEach((player, idx) => {
          var ae = new AttackEffect();
          ae.x = this.enemy.element.offset().left + Math.random() * this.enemy.element.width();
          ae.y = this.enemy.element.offset().top + Math.random() * this.enemy.element.height();
          ae.scaleX = ae.scaleY = Math.min(Math.max(1, this._attacks[idx] / 10), 10);
          setTimeout(() => {
            this.stage.addChild(ae);
            ae.gotoAndPlay(player.attribute);
          }, Math.floor(Math.random() * 500));
        });

        // all attack fly text
        setTimeout(() => {
          new FlyText({
            text: this._attack_all.toString(),
            parent: this.element,
            class: 'all_attack'
          });
        }, 500);

        // enemy hit
        setTimeout(() => {
          this.enemy.hit(this._attack_all);
        }, 1000);
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
        game.console.log('勝利!');
        this.element.hide();
        game.gainExp += this.enemy.EXP;
        this.dispatchEvent('battleFinish');
      } else {
        this.shuffleOnboardDice();
      }
      this.dispatchEvent('diceProcess');
    }

    public enemyAttacked(event: BattleEffectEvent) {
      game.console.log(event.magnitude + 'の攻撃を受けた');
      game.getDamage(event.magnitude);
    }

    constructor() {
      super($('#battle'));
      this.on('diceDetermine', this.diceDetermined, this);
      this.on('diceHover', this.diceHovered, this);
      this.on('diceUnhover', this.diceUnhovered, this);
      this._onboard_area = this.element.find('#onboard');
      this.useCanvas();
    }

  }
}
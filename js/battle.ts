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
          this.dispatchEvent('turnEnd');
        }
        );
    }

    private die(): void {
      game.console.log(this.name + 'は倒れた');
      this.dispatchEvent('turnEnd');
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
        $.each(args, (i, arg) => {
          if (typeof arg == 'function') opt.callback = arg;
          else if (arg instanceof jQuery) opt.parent = arg;
        });
      }
      if (!('transition' in opt)) opt.transition = { y: -20, opacity: 0 };
      if (!('duration' in opt)) opt.duration = 2000;

      super('flytext');
      if ('class' in opt) this.element.addClass(opt.class);

      this.element.text(opt.text).appendTo(opt.parent);
      this.element.position({
        of: opt.parent
      });
      var from = this.element.position().top;
      this.element.transition(opt.transition, opt.duration, 'out', () => {
        if ('callback' in opt) opt.callback();
        this.element.remove();
      });
    }
  }

  export class Battle extends cgdice.DomDisplayObject {
    public enemy: Enemy;
    public onboard: number[];
    private _onboard_area: JQuery;

    public start() {
      this.enemy = new Enemy('chihiro');
      $('#enemies', this.element).empty();
      this.enemy.element.appendTo('#enemies');
      this.enemy.on('enemyAttack', this.enemyAttacked, this);
      this.enemy.on('turnEnd', this.enemyTurnEnd, this);
      this.dispatchEvent('initialized');
      this.shuffleOnboardDice();
      this.element.show();
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
      game.players.forEach((c) => {
        c.highlightMultipliers(this.onboard, game.stack.getNumbers());
        c.showCurrentAttackPower(this.onboard);
      });
    }

    private diceDetermined(event: DiceEvent) {
      // dice animation
      game.players.forEach(p => p.resetHighlight());
      var dice = event.dice;
      var placeholder = this._onboard_area.find('.placeholder');
      var delta_x = placeholder.offset().left - dice.element.offset().left;
      var delta_y = placeholder.offset().top - dice.element.offset().top;
      dice.element
        .stop(true)
        .transition({
          x: delta_x,
          y: delta_y,
          rotate: 360,
          scale: 1.1
        }, 300)
        .transition({
          scale: 1
        }, 1000)
        .transition({
          opacity: 0,
          complete: () => { dice.element.remove(); }
        }, 300);

      var pips = dice.pips;
      var all_power: number = 0;
      var all_pips: number[] = this.onboard.slice();
      all_pips.push(pips);
      game.players.forEach((p: cgdice.characters.Character) => {
        var attack_power = p.attackPower(all_pips);
        new FlyText(attack_power.toString(), p.element);
        all_power += attack_power;
      });
      setTimeout(() => {
        new FlyText({
          text: all_power.toString(),
          parent: this.element,
          class: 'all_attack'
        });
      }, 500);
      setTimeout(() => {
        game.console.log(all_power + 'の攻撃!');
        this.enemy.hit(all_power);
      }, 1000);
    }

    private diceHovered(event: DiceEvent) {
      //
    }

    private diceUnhovered(event: DiceEvent) {
      //
    }

    private enemyTurnEnd() {
      game.players.forEach(p => p.resetHighlight());
      if (this.enemy.HP <= 0) {
        game.console.log('勝利!');
        this.element.hide();
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
    }

  }
}
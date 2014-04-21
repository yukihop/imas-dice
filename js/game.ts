/// <reference path="displayobject.ts" />
/// <reference path="title.ts" />
/// <reference path="field.ts" />
/// <reference path="talkshow.ts" />
/// <reference path="battle.ts" />
/// <reference path="character.ts" />

module cgdice {
  export var application: Application;
  export var game: DiceGame;

  export class Application extends createjs.EventDispatcher {
    private inEffect: boolean = true;

    public loader = new createjs.LoadQueue();

    private _title = new cgdice.titles.Title();

    private compatibilityCheck() {
      if (typeof console !== 'object') return false;
      return true;
    }

    public setInEffect(inEffect: boolean): void {
      this.inEffect = inEffect;
      if (!inEffect) {
        $('body').removeClass('in_effect');
      } else {
        $('body').addClass('in_effect');
      }
    }

    private loadComplete() {
      createjs.Ticker.setFPS(30);
      game = new DiceGame();
      game.init();
    }

    public run(): void {
      this.loader.on('complete', this.loadComplete);
      this.loader.loadManifest([
        { id: 'characters', src: 'settings/characters.json' },
        { id: 'fieldData', src: 'settings/stage1.json' },
        { id: 'enemies', src: 'settings/enemies.json' }
      ]);
    }
  }

  export class Dice extends DomDisplayObject {
    private _pips: number;
    private _animating: boolean;
    get pips(): number { return this._pips; }
    set pips(p: number) {
      this._pips = p;
      this.element.attr('class', 'dice dice' + p);
    }
    public roll(): void {
      this.pips = Math.floor(Math.random() * 6) + 1;
      this._animating = true;
      this.element.animate({ top: -10 }, 200, () => {
        this.element.animate({ top: 0 }, 200, () => {
          this._animating = false;
        })
      });
    }
    constructor() {
      super('dice');
      this.element.on('click', (event) => {
        if (this._animating) return;
        this.element.trigger('diceClick', this);
      });
    }
  }

  export class HPIndicator extends DomDisplayObject {
    private _maxHP: number = 100;
    private _HP: number = 100;
    private _hp_bar: JQuery;
    private _hp_healbar: JQuery;
    private _hp_damagebar: JQuery;

    get maxHP(): number { return this._maxHP; }
    set maxHP(value: number) {
      this._maxHP = value;
      this.refresh();
    }

    get HP(): number { return this._HP; }
    set HP(value: number) {
      if (value < 0) value = 0;
      if (value > this._maxHP) value = this._maxHP;
      if (this._HP > value) { // damage!
        var top = this.element.position().top;
        // bounce[
        this.element.addClass('damaging').animate(
          { top: top + 10 }, 400, 'easeInOutBounce', () => {
            this.element.animate(
              { top: top }, 100
            );
          }
        );
        this._hp_damagebar
          .show()
          .css('width', this.barWidth(this._HP))
          .animate(
            { width: this.barWidth(value) }, 1000, 'swing', () => {
              this._hp_damagebar.hide();
              this.element.removeClass('damaging healing');
            }
          );
        this._hp_bar.css('width', this.barWidth(value));
      }
      if (this._HP < value) { // heal!
        this.element.addClass('healing');
        this._hp_healbar.show().css('width', this.barWidth(value));
        this._hp_bar
          .animate({ width: this.barWidth(value) }, 1000, 'swing', () => {
            this._hp_healbar.hide();
            this.element.removeClass('damaging healing');
          });
      }
      this._HP = value;
      var txt = this._HP + '/' + this._maxHP;
      $('.hp_value', this.element).text(txt);
    }

    private barWidth(hp: number) {
      return Math.min(1, Math.max(hp / this._maxHP, 0)) * 100 + '%';
    }

    private refresh(): void {
      var txt = this._HP + '/' + this._maxHP;
      $('.hp_value', this.element).text(txt);
      $('.hp_bar', this.element).css('width', this.barWidth(this._HP));
      this.element.removeClass('healing damaging');
    }

    constructor() {
      super($('#hp_indicator'));
      this._hp_bar = this.element.find('.hp_bar');
      this._hp_damagebar = this.element.find('.hp_damagebar');
      this._hp_healbar = this.element.find('.hp_healbar');
      this.refresh();
    }
  }

  export class DiceIndicator extends DomDisplayObject {
    private _stock: number = 0;
    get stock(): number { return this._stock; }
    set stock(value: number) {
      if (value < 0) value = 0;
      this._stock = Math.floor(value);
      this.element.find('.dice_stock').text(this._stock);
    }
    constructor() {
      super($('#dice_indicator'));
      this.stock = 0;
    }
  }

  export class DiceStack extends DomDisplayObject {
    private _stack: Dice[];
    private _ready: boolean = false;

    get length(): number {
      return this._stack.length;
    }

    public draw() {
      var dice = new Dice();
      this._stack.push(dice);
      dice.roll();
      dice.element.on('diceClick', (event, dice: Dice) => {
        if (!this._ready) return;
        var idx = this._stack.indexOf(dice);
        if (idx == -1) {
          return; // dice already removed
        }
        this.ready(false);
        this.element.trigger('diceDetermine', dice);
        this._stack.splice(idx, 1);
        dice.element.animate({ opacity: 0 }, 500, () => {
          dice.element.remove();
        });
      });
      this.element.prepend(dice.element);
    }

    public ready(isReady: boolean = true) {
      this._ready = isReady;
      this.element.toggleClass('ready', isReady);
    }

    constructor() {
      super($('#stack'));
      this._stack = [];
      for (var i = 0; i <= 2; i++) {
        this.draw();
      }
    }
  }

  export class GameLog extends DomDisplayObject {
    public log(message: any) {
      if (typeof message == 'object') {
        message = message.toString();
      }
      var elem = $('<div>').text(message);
      this.element.append(elem);
    }

    constructor() {
      super($('#gamelog'));
    }
  }

  /**
   * DiceGame is a general manager of one instance of dice game
   * (from start block to boss).
   */
  export class DiceGame {
    public players: characters.Character[] = [];
    private energyCandies: number = 0;
    private field: fields.Field;
    public battle: battles.Battle;
    public hp: HPIndicator;
    public dice: DiceIndicator;
    private stack: DiceStack;
    private _stage: createjs.Stage;
    public console: GameLog;

    public init(): void {
      $('#field_canvas')
        .attr('width', $('#field_canvas').width())
        .attr('height', $('#field_canvas').height());

      this._stage = new createjs.Stage('field_canvas');
      createjs.Ticker.addEventListener('tick', () => {
        this._stage.update();
      });
      $(window).on('resize', () => {
        $('#field_canvas').attr('width', $('#field_canvas').width());
      });

      var names = ['ゆきほP', 'あんずP', 'らんこP'];
      for (var i = 0; i <= 2; i++) {
        var p = new characters.Character(names[i]);
        this.players.push(p);
        p.redraw();
        $('#players').append(p.element);
      }

      var maxHP = 0;
      this.players.forEach((p) => { maxHP += p.maxHP() });

      this.hp = new HPIndicator();
      this.hp.maxHP = maxHP;
      this.hp.HP = maxHP;

      this.dice = new DiceIndicator();
      this.dice.stock = 10;

      this.stack = new DiceStack();
      this.stack.element.on('diceDetermine', $.proxy(this.diceDetermined, this));

      this.battle = new battles.Battle();
      this.battle.on('diceProcess', this.diceProcessed, this);
      this.battle.on('battleFinish', () => {
      });

      var data: any = application.loader.getResult('fieldData');
      for (var i = 0; i < data.blocks.length; i++) {
        data.blocks[i].type = fields.BlockType[data.blocks[i].type];
      }
      var fieldData = <fields.FieldData>data;
      this.field = new fields.Field();
      this._stage.addChild(this.field);
      this.field.reset(fieldData);
      this.field.on('diceProcess', this.diceProcessed, this);
      this.stack.ready();

      this.console = new GameLog();

    }

    private diceProcessed() {
      if (this.dice.stock > 0) {
        this.dice.stock--;
        this.stack.draw();
      }
      if (this.stack.length == 0) {
        alert('GAME OVER');
      } else {
        this.stack.ready();
      }
    }

    public diceDetermined(event: JQueryEventObject, dice: Dice) {
      if (this.battle.element.is(':visible')) {
        this.battle.diceDetermined(dice.pips);
      } else {
        this.field.diceDetermined(dice);
      }
    }

    public getDamage(power: number) {
      this.hp.HP -= power;
    }

  }

}
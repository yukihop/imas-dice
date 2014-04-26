/// <reference path="displayobject.ts" />
/// <reference path="title.ts" />
/// <reference path="field.ts" />
/// <reference path="talkshow.ts" />
/// <reference path="battle.ts" />
/// <reference path="game_result.ts" />
/// <reference path="skill.ts" />
/// <reference path="character.ts" />

module cgdice {
  export var application: Application;
  export var game: DiceGame;

  export class Application extends createjs.EventDispatcher {
    private inEffect: boolean = true;

    public loader = new createjs.LoadQueue();

    private _title: titles.Title;
    private _stage_selector: titles.StageSelector;

    public availableCharacters: characters.Character[];

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
      game = new DiceGame();
      game.init();
      game.on('gameFinish', () => {
        this._title.element.show();
      });

      this._title = new cgdice.titles.Title();
      this._title.on('titleClose', () => {
        this._title.element.hide();
        this._stage_selector.reset();
      });

      this._stage_selector = new cgdice.titles.StageSelector();
      this._stage_selector.on('stageSelect', () => {
      });

      // initialize character data from settings file
      this.availableCharacters = [];
      var data = this.loader.getResult('characters');
      $.each(data, (i, cdata) => {
        var p = new characters.Character(cdata.name);
        this.availableCharacters.push(p);
        p.element.data('self', p);
        p.redraw();
      });
    }

    public run(): void {
      createjs.Ticker.setFPS(30);
      this.loader.on('complete', this.loadComplete, this);
      this.loader.loadManifest([
        { id: 'characters', src: 'settings/characters.json' },
        { id: 'fieldData', src: 'settings/stage1.json' },
        { id: 'enemies', src: 'settings/enemies.json' }
      ]);
    }
  }

  export class Dice extends DomDisplayObject {
    private _pips: number;

    get pips(): number { return this._pips; }
    set pips(p: number) {
      this._pips = p;
      this.element.attr('class', 'dice dice' + p);
    }

    public roll(): void {
      this.pips = Math.floor(Math.random() * 6) + 1;
      this.element
        .transition({ scale: 2 }, 100)
        .transition({ top: -10, scale: 1.0 }, 200)
        .transition({ top: 0 }, 200);
    }

    constructor() {
      super('dice');
      this.element.data('self', this);
    }
  }

  export class DicePlaceholder extends DomDisplayObject {
    constructor() {
      super('dice');
      this.element.addClass('placeholder');
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
      this.setHP(value, true);
    }

    public setHP(value: number, animation: boolean = false) {
      if (value < 0) value = 0;
      if (value > this._maxHP) value = this._maxHP;

      if (!animation) {
        this._hp_bar.stop(true).css('width', this.barWidth(value));
      } else if (this._HP > value) { // damage!
        var top = this.element.position().top;
        // bounce
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
          .transition({
            width: this.barWidth(value),
            duration: 1000,
            easing: 'easeOutQuad'
          }, () => {
            this._hp_damagebar.hide();
            this.element.removeClass('damaging healing');
          });
        this._hp_bar.css('width', this.barWidth(value));
      }
      if (this._HP < value) { // heal!
        this.element.addClass('healing');
        this._hp_healbar.show().css('width', this.barWidth(value));
        this._hp_bar
          .transition({
            width: this.barWidth(value),
            duration: 1000,
            easing: 'easeOutQuad'
          }, () => {
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

  export class DiceEvent extends createjs.Event {
    constructor(type: string, public dice: Dice, public placeholder: DicePlaceholder) {
      super(type, false, false);
    }
  }

  export class DiceStack extends DomDisplayObject {
    private _stock: number = 0;
    private _ready: boolean = false;
    private _next: number = 0;

    get length(): number {
      return this.element.find('>.dice:not(.placeholder)').length;
    }

    get stock(): number { return this._stock; }
    set stock(value: number) {
      if (value < 0) value = 0;
      this._stock = Math.floor(value);
      this.element
        .toggleClass('stock_empty', this._stock == 0)
        .find('.dice_stock').text(this._stock);
    }

    public getNumbers(): number[] {
      return this.element.find('.dice').map((i, d) => $(d).data('self').pips).get();
    }

    public specifyNext(pips: number) {
      this._next = pips;
      this.element
        .find('.next').toggle(this._next > 0)
        .find('.next_pips').text(this._next);
    }

    public draw() {
      var dice = new Dice();
      dice.roll();
      if (this._next > 0) {
        dice.pips = this._next;
        this._next = 0;
        this.element.find('.next').hide(300);
      }
      this.element.prepend(dice.element);
    }

    public ready(isReady: boolean = true) {
      this._ready = isReady;
      this.element.toggleClass('ready', isReady);
    }

    public reset(stock: number) {
      this.element.find('.dice').remove();
      for (var i = 0; i <= 2; i++) {
        this.draw();
      }
      this.stock = stock;
    }

    constructor() {
      super($('#stack'));
      this.element.on('click', '.dice', (event) => {
        if (!this._ready) {
          return;
        }
        this.ready(false);
        var dice = <Dice>$(event.currentTarget).data('self');
        var placeholder = new DicePlaceholder();
        dice.element.replaceWith(placeholder.element);
        this.dispatchEvent(new DiceEvent('diceDetermine', dice, placeholder));
        placeholder.element.transition(
          { width: 0, duration: 500 },
          () => { placeholder.element.remove(); }
          );
      });
      this.element.on('mouseenter', '.dice:not(.detached)', (event) => {
        if (!this._ready) return;
        var dice = <Dice>$(event.currentTarget).data('self');
        this.dispatchEvent(new DiceEvent('diceHover', dice, null));
      });
      this.element.on('mouseleave', '.dice:not(.detached)', (event) => {
        if (!this._ready) return;
        var dice = <Dice>$(event.currentTarget).data('self');
        this.dispatchEvent(new DiceEvent('diceUnhover', dice, null));
      });
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

    public clear() {
      this.element.empty();
    }

    constructor() {
      super($('#gamelog'));
    }
  }

  export enum GamePhase {
    Inactive, // Game is not in progress
    InField,
    InBattle,
    InResults // showing results
  }

  /**
   * DiceGame is a general manager of one instance of dice game
   * (from start block to boss).
   */
  export class DiceGame extends DomDisplayObject {
    private _phase: GamePhase = GamePhase.Inactive;
    public players: characters.Character[] = [];
    private energyCandies: number = 0;
    private field: fields.Field;
    public battle: battles.Battle;
    public gameResult: GameResult;
    public hp: HPIndicator;
    public stack: DiceStack;
    public console: GameLog;
    public gainExp: number = 0;

    get phase(): GamePhase { return this._phase; }

    private setPhase(value: GamePhase) {
      if (this._phase != value) {
        this._phase = value;
        this.dispatchEvent('phaseChange');
      }
    }

    public init(): void {
      this.hp = new HPIndicator();

      this.stack = new DiceStack();
      this.stack.on('diceDetermine', $.proxy(this.handleDiceEvent, this));
      this.stack.on('diceHover', $.proxy(this.handleDiceEvent, this));
      this.stack.on('diceUnhover', $.proxy(this.handleDiceEvent, this));

      this.battle = new battles.Battle();
      this.battle.on('diceProcess', this.diceProcessed, this);
      this.battle.on('battleFinish', () => {
        this.setPhase(GamePhase.InField);
        if (this.field.position == this.field.maxPosition) {
          $('#stage_clear').show();
          this.stageCleared();
        }
      });
      this.battle.on('initialized', () => { this.setPhase(GamePhase.InBattle); });

      this.gameResult = new GameResult();
      this.gameResult.on('gameFinish', () => {
        this.dispatchEvent('gameFinish');
      });

      this.field = new fields.Field();
      this.field.on('diceProcess', this.diceProcessed, this);

      this.console = new GameLog();

      this.element.find('#players')
        .on('skillTrigger', '.character', (event: JQueryEventObject, skill: skills.Skill) => {
          skill.invoke();
        });
    }

    public reset(fieldData: any, players: characters.Character[]) {
      var maxHP = 0;
      this.players = players;
      this.players.forEach(p => {
        p.element.appendTo($('#players', this.element));
        p.resetHighlight();
      });

      this.players.forEach((p) => { maxHP += p.maxHP() });
      this.hp.maxHP = maxHP;
      this.hp.setHP(maxHP);

      this.gainExp = 0;

      this.field.reset(fieldData);
      this.stack.reset(10);
      this.battle.element.hide();
      $('#stage_failed, #stage_clear').hide();
      this.console.clear();
      this.setPhase(GamePhase.InField);
      this.stack.ready();
    }

    private handleDiceEvent(event: DiceEvent) {
      if (this._phase == GamePhase.InBattle) {
        this.battle.dispatchEvent(event);
      } else if (this._phase == GamePhase.InField) {
        this.field.dispatchEvent(event);
      }
    }

    private stageCleared() {
      this.setPhase(GamePhase.InResults);
      this.gameResult.start();
    }

    private stageFailed() {
      this.setPhase(GamePhase.InResults);
      $('#stage_failed, #stage_clear').filter(':visible')
        .css({ y: 0 })
        .transition({
          y: 30,
          duration: 3000,
          complete: () => {
            this.dispatchEvent('gameFinish');
          }
        });
    }

    private diceProcessed() {
      if (this.hp.HP == 0) {
        $('#stage_failed').show();
        this.stageFailed();
        return;
      }
      if (this.stack.stock > 0) {
        this.stack.stock--;
        this.stack.draw();
      }
      if (this.stack.length == 0) {
        $('#stage_failed').show();
        this.stageFailed();
      } else if (this._phase != GamePhase.InResults) {
        this.stack.ready();
      }
    }

    public getDamage(power: number) {
      this.hp.HP -= power;
    }

    constructor() {
      super($('#dicegame'));
    }

  }

}
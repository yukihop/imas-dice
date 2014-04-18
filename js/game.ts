/// <reference path="displayobject.ts" />
/// <reference path="battle.ts" />
/// <reference path="character.ts" />

module cgdice {
  export var application: Application;
  export var game: DiceGame;

  export class Application extends createjs.EventDispatcher {
    private inEffect: boolean = true;

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

    public run(): void {
      createjs.Ticker.setFPS(30);
      game = new DiceGame();
      game.init();
    }
  }

  export class Dice extends DomDisplayObject {
    private _pips: number;
    private _animating: boolean;
    get pips(): number { return this._pips; }
    set pips(p: number) {
      this._pips = p;
      this.element.text(p);
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

  enum BlockType {
    Start, Empty, Enemy, Boss, Treasure, Heal, Damage, Back, Proceed
  }

  class Block extends createjs.Container {
    public type: BlockType;
    private _box: createjs.Sprite;
    private _text: createjs.DOMElement;

    public bounce() {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10, scaleX: 1.2, scaleY: 1.2 }, 300, createjs.Ease.bounceOut)
        .to({ y: y, scaleX: 1, scaleY: 1 }, 300, createjs.Ease.bounceOut)
        .call($.noop);
    }

    constructor() {
      super();

      var idx = Math.floor(Math.random() * 9);
      this.type = <BlockType>idx;

      var data = {
        images: ["images/blocks.png"],
        frames: { width: 48, height: 48 },
        animations: {
          Empty: [0],
          Start: [1],
          Treasure: [2],
          Enemy: [3],
          Heal: [4],
          Damage: [5],
          Back: [6],
          Proceed: [7],
          Boss: [8]
        }
      };
      var spriteSheet = new createjs.SpriteSheet(data);
      var animation = new createjs.Sprite(spriteSheet, "run");

      this._box = new createjs.Sprite(spriteSheet, BlockType[this.type]);
      this._box.regX = this._box.regY = 24;
      this.addChild(this._box);

      //var g = this._box.graphics;
      //g.beginFill('lime').drawRoundRect(-24, -24, 48, 48, 5).endFill();

      var t = $('<span>').addClass('block').text(BlockType[this.type]);
      t.appendTo($('#field'));
      this._text = new createjs.DOMElement(t[0]);
      this._text.x = -24;
      this._text.y = -24;
      this.addChild(this._text);

    }
  }

  class Field extends createjs.Container {
    public maxPosition: number;
    private _position: number = 0;
    private _cursor: createjs.Shape;
    public blocks: Block[] = [];

    public currentBlock(): Block {
      if (this._position < 0 || this._position >= this.blocks.length) {
        return null;
      }
      return this.blocks[this._position];
    }

    get position(): number { return this._position; }

    public moveTo(newPosition: number, immediate: boolean = false) {
      if (newPosition >= this.blocks.length) newPosition = this.blocks.length - 1;
      if (newPosition < 0) newPosition = 0;
      if (this._position == newPosition) return;
      if (immediate) {
        this._position = newPosition;
        this._cursor.setTransform(block.x, block.y - 20);
        return;
      }

      var startPosition = this._position;
      this._position = newPosition;

      application.setInEffect(true);
      var tween = createjs.Tween.get(this._cursor);
      var step = newPosition > startPosition ? 1 : -1;
      var p = startPosition;
      while (newPosition != p) {
        p += step;
        var block = this.blocks[p];
        tween.to({ x: block.x, y: block.y - 20 }, 400);
        (() => {
          var _block = block;
          tween.call(() => { _block.bounce(); });
        })();
      }
      tween.call(() => {
        application.setInEffect(false);
        this.cursorMoved();
      });
      var scroll = Math.min(0, 300 - block.x);
      createjs.Tween.removeTweens(this);
      createjs.Tween.get(this).to({ x: scroll }, 2000, createjs.Ease.quadOut).call($.noop);
    }

    public proceed(step: number, immediate: boolean = false) {
      var newPosition = this._position + step;
      this.moveTo(newPosition, immediate);
    }

    public diceDetermined(dice: Dice) {
      this.proceed(dice.pips);
    }

    public cursorMoved() {
      var block = this.currentBlock();
      var move_end = true;

      switch (block.type) {
        case BlockType.Enemy:
        case BlockType.Boss:
          game.battle.start();
          break;
        case BlockType.Heal:
          game.hp.HP += 10;
          break;
        case BlockType.Damage:
          game.getDamage(10);
          break;
        case BlockType.Treasure:
          game.dice.stock += 1;
          break;
        case BlockType.Back:
          move_end = false;
          this.proceed(-3);
          break;
        case BlockType.Proceed:
          move_end = false;
          this.proceed(3);
          break;
      }
      if (move_end) {
        this.dispatchEvent('diceProcess');
      }
    }

    constructor() {
      super();
      var lines = new createjs.Shape();
      this.addChild(lines);

      var prev: Block;
      for (var i = 0; i < 40; i++) {
        var b = new Block();
        b.x = i * 60 + 50;
        b.y = 120 + Math.random() * 40;
        this.addChild(b);
        this.blocks.push(b);
        if (i > 0) {
          lines.graphics.setStrokeStyle(5).beginStroke('#ffff00')
            .moveTo(prev.x, prev.y).lineTo(b.x, b.y).endStroke();
        }
        prev = b;
      }
      this._cursor = new createjs.Shape();
      this._cursor.graphics.beginFill('red').beginStroke('white')
        .drawRect(-10, -15, 20, 30).endFill().endStroke();
      this._cursor.setTransform(this.blocks[0].x, this.blocks[0].y);
      this.addChild(this._cursor);
    }
  }

  export class HPIndicator extends DomDisplayObject {
    private _maxHP: number = 100;
    private _HP: number = 100;

    get maxHP(): number { return this._maxHP; }
    set maxHP(value: number) {
      this._maxHP = value;
      this.redraw();
    }
    get HP(): number { return this._HP; }
    set HP(value: number) {
      if (this._HP > value) {
        var top = this.element.position().top;
        createjs.Tween.get(this.element[0])
          .to({ top: top + 10 }, 400, createjs.Ease.bounceOut)
          .to({ top: top }, 100);
      }
      this._HP = value;
      this.redraw();
    }

    private redraw(): void {
      var txt = this._HP + '/' + this._maxHP;
      var w = Math.max(this._HP / this._maxHP * 100, 0);
      $('.hp_value', this.element).text(txt);
      $('.hp_bar', this.element).css('width', w + '%');
    }

    constructor() {
      super($('#hp_indicator'));
      this.redraw();
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

  export class CharacterView extends DomDisplayObject {
    constructor(p: characters.Character) {
      super('character');
      this.element.find('.name').text(p.name);
    }
  }

  export class DiceStack extends DomDisplayObject {
    private _stack: Dice[];

    get length(): number {
      return this._stack.length;
    }

    public draw() {
      var dice = new Dice();
      this._stack.push(dice);
      dice.roll();
      dice.element.on('diceClick', (event, dice: Dice) => {
        var idx = this._stack.indexOf(dice);
        if (idx == -1) {
          return; // dice already removed
        }
        this.element.trigger('diceDetermine', dice);
        this._stack.splice(idx, 1);
        dice.element.animate({ opacity: 0 }, 500, () => {
          dice.element.remove();
        });
      });
      this.element.prepend(dice.element);
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
    private field: Field;
    public battle: battles.Battle;
    public hp: HPIndicator;
    public dice: DiceIndicator;
    private stack: DiceStack;
    private _stage: createjs.Stage;
    public console: GameLog;

    public init(): void {
      $('#dicegame_canvas').attr('width', $('#dicegame_canvas').width());
      $('#dicegame_canvas').attr('height', $('#dicegame_canvas').height());

      this._stage = new createjs.Stage('dicegame_canvas');
      createjs.Ticker.addEventListener('tick', () => {
        this._stage.update();
      });

      var names = ['ゆきほP', 'あんずP', 'らんこP'];
      for (var i = 0; i <= 2; i++) {
        var p = new characters.Character();
        p.name = names[i];
        this.players.push(p);
        var view = new CharacterView(p);
        $('#players').append(view.element);
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

      this.field = new Field();
      this._stage.addChild(this.field);
      this.field.moveTo(0);
      this.field.on('diceProcess', this.diceProcessed, this);

      this.console = new GameLog();

      // temporary
      // this.battle.start();
    }

    private diceProcessed() {
      if (this.dice.stock > 0) {
        this.dice.stock--;
        this.stack.draw();
      }
      if (this.stack.length == 0) {
        alert('GAME OVER');
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
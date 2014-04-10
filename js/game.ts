module CGDice {
  export var application: Application;

  export class Application {
    private inEffect: boolean = true;
    private diceGame: DiceGame;

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
      this.diceGame = new DiceGame();
      this.diceGame.init();
    }
  }

  class DisplayObject {
    public element: JQuery;

    constructor(template: string);
    constructor(element: JQuery);
    constructor(element: any) {
      if (typeof element == 'string') {
        this.element = $('.' + element, $('#templates')).clone();
      } else {
        this.element = element;
      }
    }
  }

  class Character extends DisplayObject {
    public maxHP: number;
    private _HP: number;
    private _name: string;

    get name(): string {
      return this._name;
    }
    set name(theName: string) {
      this._name = theName;
      $('.name', this.element).text(theName);
    }

    get HP(): number {
      return this._HP;
    }
  }

  class PlayerCharacter extends Character {
    public damagePoint: number;
    public skills: string[];
    public stun: boolean;
    public knockedOut: boolean;

    public getDamage(amount: number) {
      this.damagePoint -= amount;
      if (this.damagePoint < 0) this.damagePoint = 0;
    }

    constructor() {
      super('character');
    }
  }

  enum GamePhase {
    Normal,
    InAnimation // unresponsive to mouse events
  }

  class Dice extends DisplayObject {
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
    Start, Empty, Enemy, Boss, Treasure, Heal, Damage
  }

  class Block extends createjs.Container {
    public type: BlockType;
    private _box: createjs.Sprite;
    private _text: createjs.DOMElement;

    public bounce() {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10 }, 300, createjs.Ease.bounceOut)
        .to({ y: y }, 300, createjs.Ease.bounceOut)
        .call($.noop);
    }

    constructor() {
      super();

      var idx = Math.floor(Math.random() * 7);
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

  class Battle extends DisplayObject {
    public start() {
      this.element.show();
    }

    constructor() {
      super($('#battle'));
      this.element.on('click', () => {
        this.element.trigger('battleFinish');
      });
    }
  }

  class Field extends DisplayObject {
    public maxPosition: number;
    private _position: number = 0;
    private _container: createjs.Container;
    private _cursor: createjs.Shape;
    private _cursorPosition: number = 0;
    public blocks: Block[] = [];
    private _stage: createjs.Stage;

    public currentBlock(): Block {
      if (this._position < 0 || this._position >= this.blocks.length) {
        return null;
      }
      return this.blocks[this._position];
    }

    private afterCursorMove() {
      this.blocks[this._cursorPosition].bounce();
      if (this._position != this._cursorPosition) {
        this.moveCursorByOne();
      } else {
        application.setInEffect(false);
        this.element.trigger('cursorMove', this);
      }
    }

    private moveCursorByOne() {
      if (this._position > this._cursorPosition) {
        this._cursorPosition++;
      } else if (this._position < this._cursorPosition) {
        this._cursorPosition--;
      } else {
        return;
      }
      application.setInEffect(true);
      var block = this.blocks[this._cursorPosition];
      var fieldWidth = this.element.width();
      var scroll = Math.min(0, fieldWidth / 2 - block.x);
      createjs.Tween.get(this._cursor).to({ x: block.x, y: block.y - 20 }, 400).call(this.afterCursorMove, [], this);
      createjs.Tween.get(this._container).to({ x: scroll }, 1000).call($.noop);
    }

    get position(): number { return this._position; }
    set position(value: number) {
      this._position = value;
      this.moveCursorByOne();
    }

    public proceed(step: number, immediate: boolean = false) {
      var newPosition = this._position + step;
      if (newPosition >= this.blocks.length) newPosition = this.blocks.length - 1;
      if (newPosition < 0) newPosition = 0;
      this._position = newPosition;
      this.moveCursorByOne();
    }

    constructor() {
      super($('#field'));
      this.element.empty();
      $('#field_canvas').attr('width', $('#field_canvas').width());
      $('#field_canvas').attr('height', $('#field_canvas').height());
      this._stage = new createjs.Stage('field_canvas');
      this._container = new createjs.Container();
      createjs.Ticker.addEventListener('tick', () => {
        this._stage.update();
      });
      this._stage.addChild(this._container);
      var lines = new createjs.Shape();
      this._container.addChild(lines);

      var prev: Block;
      for (var i = 0; i < 40; i++) {
        var b = new Block();
        b.x = i * 60 + 10;
        b.y = 30 + Math.random() * 40;
        this._container.addChild(b);
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
      this._container.addChild(this._cursor);
      this._stage.update();
      this.position = 0;
    }
  }

  class HPIndicator extends DisplayObject {
    private _maxHP: number = 100;
    private _HP: number = 100;

    get maxHP(): number { return this._maxHP; }
    set maxHP(value: number) { this._maxHP = value; this.redraw(); }
    get HP(): number { return this._HP; }
    set HP(value: number) {
      if (this._HP > value) {
        createjs.Tween.get(this.element[0])
          .to({ top: 10 }, 400, createjs.Ease.bounceOut)
          .to({ top: 0 }, 100)
          .call($.noop);
      }
      this._HP = value; this.redraw();
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

  class DiceGame {
    private players: Character[] = [];
    private energyCandies: number = 0;
    private phase: GamePhase = GamePhase.Normal;
    private hp: HPIndicator;
    private field: Field;
    private battle: Battle;

    private compatibilityCheck() {
      if (typeof console !== 'object') return false;
      return true;
    }

    public init(): void {
      var names = ['ゆきほP', 'あんずP', 'らんこP'];
      for (var i = 0; i <= 2; i++) {
        var p = new PlayerCharacter();
        p.name = names[i];
        this.players.push(p);
        $('#players').append(p.element);
      }

      this.hp = new HPIndicator();
      this.hp.maxHP = 120;
      this.hp.HP = 60;

      this.battle = new Battle();
      this.battle.element.on('battleFinish', () => {
        this.battle.element.hide();
      });

      this.field = new Field();
      this.field.position = 0;
      this.field.element.on('cursorMove', () => {
        var block = this.field.currentBlock();
        switch (block.type) {
          case BlockType.Enemy:
          case BlockType.Boss:
            this.battle.start();
            break;
          case BlockType.Heal:
            this.hp.HP += 10;
            break;
          case BlockType.Damage:
            this.hp.HP -= 10;
            break;
        }
      });

      for (i = 0; i <= 2; i++) {
        var dice = new Dice();
        dice.roll();
        dice.element.on('diceClick', (event, dice: Dice) => {
          this.field.proceed(dice.pips);
          dice.roll();
        });
        $('#stack').append(dice.element);
      }
    }
  }

}
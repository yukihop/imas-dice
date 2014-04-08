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

  class Block extends DisplayObject {
    public type: BlockType;

    public bounce() {
      this.element.effect('bounce');
    }

    constructor() {
      super('block');
      var idx = Math.floor(Math.random() * 7);
      this.type = <BlockType>idx;
      this.element.addClass(BlockType[idx].toLowerCase());
    }
  }

  class Field extends DisplayObject {
    public maxPosition: number;
    private _position: number = 0;
    private _cursor: JQuery;
    private _cursorPosition: number = 0;
    public blocks: Block[] = [];

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

    private cursorXY(index: number): JQueryCoordinates {
      var block = this.blocks[index].element;
      var p: JQueryCoordinates = block.position();
      var x: number = p.left + this.element.scrollLeft() + 15;
      var y: number = p.top - 15;
      return { left: x, top: y };
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
      var xy: JQueryCoordinates = this.cursorXY(this._cursorPosition);
      var fieldWidth = this.element.width();
      this.element.scrollLeft(Math.max(0, xy.left - fieldWidth / 2));
      this._cursor.text(this._cursorPosition);
      this._cursor.animate(xy, 400, () => { this.afterCursorMove() });
      $('.block', this.element).removeClass('active');
      this.blocks[this._cursorPosition].element.addClass('active');
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
      for (var i = 0; i < 40; i++) {
        var b = new Block();
        b.element.css({ left: i * 60 + 10, top: 50 + Math.random() * 20 });
        b.element.text((i + 1).toString());
        this.element.append(b.element);
        this.blocks.push(b);
      }
      this._cursor = $('<div>').addClass('cursor').appendTo(this.element);
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
        this.element.effect('bounce');
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

      this.field = new Field();
      this.field.position = 0;
      this.field.element.on('cursorMove', () => {
        var block = this.field.currentBlock();
        switch (block.type) {
          case BlockType.Enemy:
          case BlockType.Boss:
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
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
    Start, Empty, Enemy, Boss, Treasure, Damage, Heal
  }

  class Block extends DisplayObject {
    public type: BlockType;
    constructor() {
      super('block');
      var idx = Math.floor(Math.random() * 5);
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

    private afterCursorMove() {
      if (this._position != this._cursorPosition) {
        this.moveCursorByOne();
      } else {
        application.setInEffect(false);
        this.element.trigger('cursorMoved', this);
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
      var block = this.blocks[this._cursorPosition].element;
      var left: number = block.position().left + this.element.scrollLeft();
      var fieldWidth = this.element.width();
      this.element.scrollLeft(Math.max(0, left - fieldWidth / 2));
      this._cursor.text(this._cursorPosition);
      this._cursor.animate({ left: left }, 400, () => { this.afterCursorMove() });
      $('.block', this.element).removeClass('active');
      block.addClass('active');
    }

    get position(): number { return this._position; }
    set position(thePosition: number) {
      if (thePosition >= this.blocks.length) thePosition = this.blocks.length - 1;
      this._position = thePosition;
      this.moveCursorByOne();
    }

    constructor() {
      super('field');
      for (var i = 0; i < 40; i++) {
        var b = new Block();
        b.element.css({ left: i * 60 + 10, top: 50 });
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
    set HP(value: number) { this._HP = value; this.redraw(); }

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

    private bl() {
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
      $('#field_container').empty();
      $('#field_container').append(this.field.element);

      for (i = 0; i <= 2; i++) {
        var dice = new Dice();
        dice.roll();
        dice.element.on('diceClick', (event, dice: Dice) => {
          this.proceed(dice.pips);
          dice.roll();
        });
        $('#stack').append(dice.element);
      }
    }

    public proceed(step: number): void {
      this.field.position += step;
    }
  }

}
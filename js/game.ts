class DisplayObject {
  public element: JQuery;
  constructor(template: string) {
    this.element = $('.' + template, $('#templates')).clone();
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
  
  constructor () {
    super('character');
  }
}

enum GamePhase {
  Normal
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
    this.element.animate({top: -10}, 200, () => {
      this.element.animate({top: 0}, 200, () => {
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
  Start, Empty, Enemy, Boss, Treasure
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
  public blocks: Block[] = [];

  get position(): number { return this._position; }
  set position(thePosition: number) {
    if (thePosition >= this.blocks.length) thePosition = this.blocks.length - 1;
    this._position = thePosition;
    var block = this.blocks[this._position].element;
    this._cursor.css({left: block.position().left});
    this._cursor.text(thePosition);
  }

  constructor() {
    super('field');
    for (var i = 0; i < 40; i++) {
      var b = new Block();
      b.element.css({ left: i * 60 + 10, top: 50});
      this.element.append(b.element);
      this.blocks.push(b);
    }
    this._cursor = $('<div>').addClass('cursor').appendTo(this.element);
  }
}

class DiceGame {
  private players: Character[] = [];
  private energyCandies: number = 0;
  private phase: GamePhase = GamePhase.Normal;
  private field: Field;

  private compatibilityCheck() {
    if (typeof console !== 'object') return false;
    return true;
  }

  public init(): void {
    if (!this.compatibilityCheck()) {
      alert('このブラウザは使えません');
    }

    var names = ['ゆきほP', 'あんずP', 'らんこP'];
    for (var i = 0; i <= 2; i++) {
      var p = new PlayerCharacter();
      p.name = names[i];
      this.players.push(p);
      $('#players').append(p.element);
    }

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

  public proceed(step: number):void {
    this.field.position += step;
    console.log(this.field.position);
  }
}
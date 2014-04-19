module cgdice.fields {

  export enum BlockType {
    Start, Empty, Enemy, Boss, Treasure, Heal, Damage, Back, Proceed
  }

  export interface BlockInfo {
    type: BlockType;
  }

  export interface FieldData {
    name: string;
    blocks: BlockInfo[];
  }

  export class Block extends createjs.Container {
    private _type: BlockType = BlockType.Empty;
    private _box: createjs.Sprite;
    private _text: createjs.DOMElement;

    get type(): BlockType { return this._type; }
    set type(value: BlockType) { this._type = value; this.redraw(); }

    public bounce() {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10, scaleX: 1.2, scaleY: 1.2 }, 300, createjs.Ease.bounceOut)
        .to({ y: y, scaleX: 1, scaleY: 1 }, 300, createjs.Ease.bounceOut);
    }

    private redraw() {
      this._box.gotoAndStop(BlockType[this._type]);
    }

    constructor() {
      super();
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
    }
  }

  export class Field extends createjs.Container {
    public maxPosition: number;
    private _position: number = 0;
    private _lines: createjs.Shape;
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

    public reset(fieldData: FieldData) {
      var data = fieldData.blocks;
      var prev: Block;

      if (this._lines) this.removeChild(this._lines);
      var lines = new createjs.Shape();
      this._lines = lines;

      this.addChild(lines);
      for (var i = 0; i < data.length; i++) {
        var b = new Block();
        b.type = data[i].type;
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
      this.moveTo(0);
    }

    constructor() {
      super();

      this._cursor = new createjs.Shape();
      this._cursor.graphics.beginFill('red').beginStroke('white')
        .drawRect(-10, -15, 20, 30).endFill().endStroke();
      this.addChild(this._cursor);
    }
  }

}
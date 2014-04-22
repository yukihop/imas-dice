module cgdice.fields {

  export enum BlockType {
    Start, Empty, Enemy, Boss, Treasure, Heal, Damage, Back, Proceed
  }

  export interface BlockInfo {
    type: BlockType;
  }

  export class Block extends createjs.Container {
    private _type: BlockType = BlockType.Empty;
    private _box: createjs.Sprite;
    public talk: string;

    get type(): BlockType { return this._type; }
    set type(value: BlockType) { this._type = value; this.redraw(); }

    public bounce() {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10, scaleX: 1.2, scaleY: 1.2 }, 300, createjs.Ease.bounceOut)
        .to({ y: y, scaleX: 1, scaleY: 1 }, 300, createjs.Ease.bounceOut);
    }

    public rotate() {
      createjs.Tween.get(this)
        .to({ rotation: 360 }, 200)
        .set({ rotation: 0 });
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

    static fromObject(blockData: any) {
      var block = new Block();
      if (typeof blockData == 'string') {
        block.type = BlockType[<string>blockData];
      } else {
        block.type = BlockType[<string>(blockData.type)];
        block.talk = ('talk' in blockData) ? blockData.talk : null;
      }
      return block;
    }
  }

  export class Field extends createjs.Container {
    private _position: number = 0;
    private _lines: createjs.Shape;
    private _cursor: createjs.Shape;
    public blocks: Block[] = [];
    private _selected_dice: Dice;

    public currentBlock(): Block {
      if (this._position < 0 || this._position >= this.blocks.length) {
        return null;
      }
      return this.blocks[this._position];
    }

    get position(): number { return this._position; }

    get maxPosition(): number { return this.blocks.length - 1; }

    public moveTo(newPosition: number, immediate: boolean = false) {
      var block: Block;
      if (newPosition >= this.blocks.length) newPosition = this.blocks.length - 1;
      if (newPosition < 0) newPosition = 0;
      if (immediate) {
        block = this.blocks[newPosition];
        this._cursor.setTransform(block.x, block.y - 20);
        this._position = newPosition;
        return;
      }
      if (this._position == newPosition) return;

      var startPosition = this._position;
      this._position = newPosition;

      application.setInEffect(true);
      var tween = createjs.Tween.get(this._cursor);
      var step = newPosition > startPosition ? 1 : -1;
      var p = startPosition;
      while (newPosition != p) {
        p += step;
        block = this.blocks[p];
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
      createjs.Tween.get(this).to({ x: scroll }, 2000, createjs.Ease.quadOut);
    }

    public proceed(step: number, immediate: boolean = false) {
      var newPosition = this._position + step;
      this.moveTo(newPosition, immediate);
    }

    private diceDetermined(event: DiceEvent) {
      this._selected_dice = event.dice;
      this.proceed(event.dice.pips);
      event.dice.element
        .stop(true)
        .transition({
          x: 0,
          y: -100,
          rotate: 360,
          scale: 1.5
        }, 300);
    }

    public cursorMoved() {
      var block = this.currentBlock();
      var move_end = true;

      this._selected_dice.element.transition({
        opacity: 0,
        complete: () => {
          if (this._selected_dice) this._selected_dice.element.remove();
        }
      }, 300);

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
          game.stack.stock += 1;
          break;
        case BlockType.Back:
          block.rotate();
          this.proceed(-3);
          move_end = false;
          break;
        case BlockType.Proceed:
          block.rotate();
          this.proceed(3);
          move_end = false;
          break;
      }
      if (move_end) {
        if (block.talk) cgdice.talks.Talk.show(block.talk);
        this.dispatchEvent('diceProcess');
      }
    }

    public reset(fieldData: any) {
      var blocksData = fieldData.blocks;
      var prev: Block;

      this.removeAllChildren();
      this.blocks = [];
      var lines = new createjs.Shape();
      this._lines = lines;
      this.addChild(lines);

      for (var i = 0; i < blocksData.length; i++) {
        var b = Block.fromObject(blocksData[i]);
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
      this.addChild(this._cursor);

      this.moveTo(0, true);
      this.x = 0;
    }

    constructor() {
      super();
      this.on('diceDetermine', this.diceDetermined, this);
    }
  }

}
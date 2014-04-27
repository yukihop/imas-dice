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

    static _spriteSheet: createjs.SpriteSheet;

    get type(): BlockType { return this._type; }
    set type(value: BlockType) { this._type = value; this.redraw(); }

    public cursorStep(callback: () => void = $.noop) {
      this.bounce(callback);
    }

    public cursorStop(callback: () => void = $.noop) {
      switch (this._type) {
        case BlockType.Back:
        case BlockType.Proceed:
          this.rotate(callback);
          break;
        case BlockType.Enemy:
          this.bounce(callback, 2, 1000);
        default:
          this.bounce(callback);
      }
    }

    private bounce(callback: () => void, scale: number = 1.2, duration: number = 600) {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10, scaleX: scale, scaleY: scale }, duration / 2, createjs.Ease.bounceOut)
        .to({ y: y, scaleX: 1, scaleY: 1 }, duration / 2, createjs.Ease.bounceOut)
        .call(callback);
    }

    private rotate(callback: () => void) {
      createjs.Tween.get(this)
        .to({ rotation: 360 }, 200)
        .set({ rotation: 0 })
        .call(callback);
    }

    private redraw() {
      this._box.gotoAndStop(BlockType[this._type]);
    }

    constructor() {
      super();

      if (!Block._spriteSheet) {
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
        Block._spriteSheet = new createjs.SpriteSheet(data);
      }
      this._box = new createjs.Sprite(Block._spriteSheet, BlockType[this.type]);
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

  interface Vector {
    x: number;
    y: number;
  }

  interface Bounds {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
  }

  export class Field extends StatusClient {
    private _position: number = 0;
    private _lines: createjs.Shape;
    private _cursor: createjs.Shape;
    public blocks: Block[] = [];
    private _selected_dice: Dice;
    private _blockBounds: Bounds;
    private _container: createjs.Container = new createjs.Container();

    public currentBlock(): Block {
      if (this._position < 0 || this._position >= this.blocks.length) {
        return null;
      }
      return this.blocks[this._position];
    }

    get position(): number { return this._position; }

    get maxPosition(): number { return this.blocks.length - 1; }

    private scrollField(block: Block, animation: boolean = true) {
      var b = this._blockBounds;
      var w = this.stage.canvas.width;
      var h = this.stage.canvas.height;
      var pad = { left: 50, right: 50, top: 50, bottom: 150 };
      var x = (w / 2) - block.x;
      if (b.xmax - b.xmin < w - pad.left - pad.right) {
        x = (w - b.xmax - b.xmin + pad.left - pad.right) / 2;
      } else {
        x = Math.min(x, b.xmin + pad.left);
        x = Math.max(x, w - b.xmax - pad.right);
      }
      var y = (h / 2) - block.y;
      if (b.ymax - b.ymin < h - pad.top - pad.bottom) {
        y = (h - b.ymax - b.ymin + pad.top - pad.bottom) / 2;
      } else {
        y = Math.min(y, b.ymin + pad.top);
        y = Math.max(y, w - b.ymax - pad.bottom);
      }
      createjs.Tween.removeTweens(this._container);
      var duration = animation ? 2000 : 0;
      createjs.Tween.get(this._container)
        .to({ x: x, y: y }, duration, createjs.Ease.quadOut);
    }

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
        tween.to({ x: block.x, y: block.y - 20 }, 400, createjs.Ease.quadOut);
        (() => {
          var _block = block;
          if (newPosition != p) {
            tween.call(() => { _block.cursorStep(); });
          } else {
            tween.call(() => { _block.cursorStop(); });
          }
        })();
      }
      tween.call(() => {
        application.setInEffect(false);
        this.cursorMoved();
      });
      this.scrollField(block);
    }

    public proceed(step: number, immediate: boolean = false) {
      var newPosition = this._position + step;
      this.moveTo(newPosition, immediate);
    }

    private diceDetermined(event: DiceEvent) {
      this._selected_dice = event.dice;
      this.proceed(event.dice.pips);
      event.dice.element
        .appendTo($('#field'))
        .position({ of: event.placeholder.element })
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

      if (game.stack.length == 0 && block.type != BlockType.Back && block.type != BlockType.Proceed) {
        this.dispatchEvent('diceProcess');
        return;
      }

      switch (block.type) {
        case BlockType.Enemy:
        case BlockType.Boss:
          move_end = false;
          setTimeout(() => {
            game.battle.start();
            this.dispatchEvent('diceProcess');
          }, 1000);
          break;
        case BlockType.Heal:
          game.hp.HP += 10;
          break;
        case BlockType.Damage:
          game.getDamage(10);
          break;
        case BlockType.Treasure:
          game.stack.stock += 5;
          break;
        case BlockType.Back:
          this.proceed(-3);
          move_end = false;
          break;
        case BlockType.Proceed:
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

      this._container.removeAllChildren();
      this.blocks = [];
      var lines = new createjs.Shape();
      this._lines = lines;
      this._container.addChild(lines);

      var bn: Bounds;
      var layout_func = FieldLayout.horizontal;
      if ('layout' in fieldData && fieldData.layout in FieldLayout) {
        layout_func = FieldLayout[fieldData.layout];
      }

      for (var i = 0; i < blocksData.length; i++) {
        var b = Block.fromObject(blocksData[i]);
        var pos = layout_func(i, blocksData.length);
        if (i == 0) {
          bn = { xmin: pos.x, xmax: pos.x, ymin: pos.y, ymax: pos.y };
        } else {
          bn.xmin = Math.min(bn.xmin, pos.x);
          bn.xmax = Math.max(bn.xmax, pos.x);
          bn.ymin = Math.min(bn.ymin, pos.y);
          bn.ymax = Math.max(bn.ymax, pos.y);
        }
        b.x = pos.x;
        b.y = pos.y;
        this._container.addChild(b);
        this.blocks.push(b);
        if (i > 0) {
          lines.graphics.setStrokeStyle(5).beginStroke('#ffff00')
            .moveTo(prev.x, prev.y).lineTo(b.x, b.y).endStroke();
        }
        prev = b;
      }

      this._blockBounds = bn;

      this._cursor = new createjs.Shape();
      this._cursor.graphics.beginFill('red').beginStroke('white')
        .drawRect(-10, -15, 20, 30).endFill().endStroke();
      this._container.addChild(this._cursor);

      this.moveTo(0, true);
      this.scrollField(this.blocks[0], false);
      this._container.x = 0;
    }

    constructor() {
      super($('#field'));

      this.useCanvas();
      $(window).on('resize', () => this.adjustCanvasSize());

      this.stage.addChild(this._container);
      this.on('diceDetermine', this.diceDetermined, this);

      createjs.Ticker.on('tick', () => {
        this.stage.update();
      });

    }
  }

  class FieldLayout {
    static horizontal(index: number, count: number): Vector {
      return { x: index * 60, y: Math.sin(2 * Math.PI / 10 * index) * 40 };
    }

    static vertical(index: number, count: number): Vector {
      return { x: 300, y: index * 60 };
    }

    static zigzagHorizontal(index: number, count: number): Vector {
      var amp = 3;
      var x = Math.floor(index / amp) * 60;
      var y = index % amp;
      if (index % (amp * 2) < amp) {
        y = amp - y - 1;
      }
      y *= 60;
      return { x: x, y: y };
    }
  }

}
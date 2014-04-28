module cgdice.fields {

  export class Block extends createjs.Container {
    private _style: string;
    public className: string;
    private _box: createjs.Sprite;
    public talk: string;

    static _spriteSheet: createjs.SpriteSheet;

    get style(): string { return this._style; }
    set style(value: string) { this._style = value; this.redraw(); }

    /**
     * React animation when cursor steps over this block.
     */
    public cursorStep(callback: () => void = $.noop) {
      this.bounce(callback);
    }

    /**
     * React animation when cursor stops at this block.
     */
    public cursorStop(callback: () => void = $.noop) {
      this.bounce(callback);
    }

    public bounce(callback: () => void, scale: number = 1.2, duration: number = 600) {
      var y = this.y;
      createjs.Tween.get(this)
        .to({ y: y - 10, scaleX: scale, scaleY: scale }, duration / 2, createjs.Ease.bounceOut)
        .to({ y: y, scaleX: 1, scaleY: 1 }, duration / 2, createjs.Ease.bounceOut)
        .call(callback);
    }

    public rotate(callback: () => void) {
      createjs.Tween.get(this)
        .to({ rotation: 360 }, 200)
        .set({ rotation: 0 })
        .call(callback);
    }

    private redraw() {
      if (!this._box) return;
      this._box.gotoAndStop(this.style);
    }

    constructor(type: string, data: any) {
      super();

      if (!Block._spriteSheet) {
        var sprite_data = {
          images: ["images/blocks.png"],
          frames: { width: 48, height: 48 },
          animations: {
            empty: [0],
            start: [1],
            treasure: [2],
            enemy: [3],
            heal: [4],
            damage: [5],
            back: [6],
            proceed: [7],
            boss: [8]
          }
        };
        Block._spriteSheet = new createjs.SpriteSheet(sprite_data);
      }
      this._box = new createjs.Sprite(Block._spriteSheet);
      this._box.regX = this._box.regY = 24;
      this.addChild(this._box);
    }

    static fromObject(blockData: any) {
      var classMap = {
        start: 'EmptyBlock',
        empty: 'EmptyBlock',
        treasure: 'TreasureBlock',
        enemy: 'EnemyBlock',
        boss: 'EnemyBlock',
        heal: 'DamageBlock',
        damage: 'DamageBlock',
        back: 'ProceedBlock',
        proceed: 'ProceedBlock'
      };
      var type: string;
      var className: string;
      var block: Block;
      if (typeof blockData == 'string') {
        var params = (<string>blockData).split(/\s+/);
        type = params[0].toLowerCase();
        className = classMap[type];
        block = new (cgdice.fields[className])(type, params);
      } else {
        type = (<string>blockData.type).toLowerCase();
        className = classMap[type];
        block = new (cgdice.fields[className])(type, blockData);
        block.talk = ('talk' in blockData) ? blockData.talk : null;
      }
      block.style = type;
      return block;
    }
  }

  export class EmptyBlock extends Block {
    constructor(type: string, data: any) {
      super(type, data);
      this.className = 'EmptyBlock';
    }
  }

  export class EnemyBlock extends Block {
    public cursorStop(callback: () => void = $.noop) {
      this.bounce(callback, 2, 1000);
    }

    constructor(type: string, data: any) {
      super(type, data);
      this.className = 'EnemyBlock';
    }
  }

  export class TreasureBlock extends Block {
    public diceNumber: number;

    constructor(type: string, data: any) {
      super(type, data);
      this.className = 'TreasureBlock';
      this.diceNumber = 5;
      if (data instanceof Array && data.length >= 2) {
        this.diceNumber = parseInt(data[1]);
      } else if ('number' in data) {
        this.diceNumber = parseInt(data['number']);
      }
    }
  }

  export class DamageBlock extends Block {
    public damageValue: number;
    private _numtext: createjs.Text;

    constructor(type: string, data: any) {
      super(type, data);
      this.className = 'DamageBlock';
      this.damageValue = 10;
      if (data instanceof Array && data.length >= 2) {
        this.damageValue = parseInt(data[1]);
      } else if ('number' in data) {
        this.damageValue = parseInt(data['damage']);
      }
      if (type == 'heal') this.damageValue = -this.damageValue;

      this._numtext = new createjs.Text(
        Math.abs(this.damageValue).toString(),
        'bold 16px sans-serif',
        'white');
      this._numtext.textAlign = 'right';
      this._numtext.x = 18;
      this.addChild(this._numtext);
    }
  }

  export class ProceedBlock extends Block {
    public step: number;
    private _numtext: createjs.Text;

    public cursorStop(callback: () => void = $.noop) {
      this.rotate(callback);
    }

    constructor(type: string, data: any) {
      super(type, data);
      this.className = 'ProceedBlock';
      this.step = 3;
      if (data instanceof Array && data.length >= 2) {
        this.step = parseInt(data[1]);
      } else if ('number' in data) {
        this.step = parseInt(data['step']);
      }
      if (type == 'back') this.step = -this.step;

      this._numtext = new createjs.Text(
        Math.abs(this.step).toString(),
        'bold 18px sans-serif',
        'black');
      this._numtext.textAlign = 'center';
      this._numtext.x = 5;
      this._numtext.y = -20;
      this.addChild(this._numtext);
    }

  }

  // Enemy, Boss, Treasure, Heal, Damage, Back, Proceed

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
    private _move_callback: () => void;
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

    public moveTo(newPosition: number, immediate: boolean = false, callback?: () => void) {
      var block: Block;
      if (callback) this._move_callback = callback; else this._move_callback = null;
      if (newPosition >= this.blocks.length) newPosition = this.blocks.length - 1;
      if (newPosition < 0) newPosition = 0;
      if (immediate) {
        block = this.blocks[newPosition];
        this._cursor.setTransform(block.x, block.y - 20);
        this._position = newPosition;
        callback && callback();
        return;
      }
      if (this._position == newPosition) {
        callback && callback();
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

    public proceed(step: number, immediate: boolean = false, callback?: () => void) {
      var newPosition = this._position + step;
      this.moveTo(newPosition, immediate, callback);
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

      if (this._selected_dice) {
        this._selected_dice.element.transition({
          opacity: 0,
          complete: () => {
            if (this._selected_dice) this._selected_dice.element.remove();
          }
        }, 300);
      }

      var dispatch = () => {
        this._move_callback && this._move_callback();
        this._selected_dice && this.dispatchEvent('diceProcess');
        this._selected_dice = null;
      };

      if (game.stack.length == 0 && block.className != 'ProceedBlock') {
        dispatch();
        return;
      }

      switch (block.className) {
        case 'EnemyBlock':
          move_end = false;
          setTimeout(() => {
            game.battle.start();
            dispatch();
          }, 1000);
          break;
        case 'DamageBlock':
          game.hp.HP -= (<DamageBlock>block).damageValue;
          break;
        case 'TreasureBlock':
          game.stack.stock += (<TreasureBlock>block).diceNumber;
          break;
        case 'ProceedBlock':
          this.proceed((<ProceedBlock>block).step, false, this._move_callback);
          move_end = false;
          break;
      }
      if (move_end) {
        if (block.talk) cgdice.talks.Talk.show(block.talk);
        dispatch();
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
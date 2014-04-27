module cgdice {

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

    public shuffleExistingDices() {
      this.element.find('>.dice:not(.placeholder)').each((i, elem) => {
        var dice = <Dice>$(elem).data('self');
        dice.roll();
      });
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



  export class DiceEvent extends createjs.Event {
    constructor(type: string, public dice: Dice, public placeholder: DicePlaceholder) {
      super(type, false, false);
    }
  }


}
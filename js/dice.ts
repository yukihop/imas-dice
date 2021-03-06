module cgdice {

  /**
   * Encapsulates one dice.
   */
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
      super('dice_placeholder');
    }
  }

  /**
   * Encapsulates dice stack. Three dices are shown by default, and
   * triggers click events.
   */
  export class DiceStack extends DomDisplayObject {
    private _stock: number = 0;
    private _next: number = 0;
    private _capacity: number = 3;

    get length(): number {
      return this.element.find('>.dice').length;
    }

    get stock(): number { return this._stock; }
    set stock(value: number) {
      if (value < 0) value = 0;
      var change = value - this._stock;
      this._stock = value;
      this.element
        .toggleClass('stock_empty', this._stock == 0)
        .find('.dice_stock').text(this._stock);
      if (change != 0) {
        var text = (change > 0 ? '+' : '') + change;
        var ci = $('<div>');
        ci.addClass('stock_change')
          .text(text)
          .toggleClass('plus', change > 0)
          .appendTo(this.element.find('#dice_indicator'))
          .position({
            of: $('.dice_stock', this.element),
            my: (change > 0 ? 'bottom-15px' : 'bottom'),
            at: 'top'
          })
          .transition({
            y: -20,
            opacity: 0,
            duration: 2000,
            easing: 'easeInQuad',
            complete: () => {
            ci.remove();
          }
          });
      }
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

    public draw(noUseStock: boolean = false) {
      if (!noUseStock && this.stock <= 0) {
        return;
      }
      this.stock--;
      var dice = new Dice();
      dice.roll();
      if (this._next > 0) {
        dice.pips = this._next;
        this._next = 0;
        this.element.find('.next').hide(300);
      }
      this.element.prepend(dice.element);
    }

    public drawUntilLimit() {
      var count = this._capacity - this.element.find('.dice').length;
      var i: number;
      for (i = 0; i < count; i++) {
        this.draw();
      }
    }

    public shuffleExistingDices() {
      this.element.find('>.dice').each((i, elem) => {
        var dice = <Dice>$(elem).data('self');
        dice.roll();
      });
    }

    public reset(stock: number) {
      this.element.find('.dice').remove();
      for (var i = 0; i < this._capacity; i++) {
        this.draw(true);
      }
      this.stock = stock;
    }

    private blink() {
      var marker = $('#select_marker', this.element)
      if ($('.ui-dialog:visible').length) {
        marker.removeClass('alt');
      } else {
        marker.toggleClass('alt');
      }
      if (game.ready) {
        setTimeout(() => this.blink(), 500);
      }
    }

    constructor() {
      super($('#stack'));

      game.addEventListener('ready', () => this.blink());

      this.element.on('click', '.dice', (event) => {
        if (!game.ready) {
          return;
        }
        game.setReady(false);
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
        if (!game.ready) return;
        var dice = <Dice>$(event.currentTarget).data('self');
        this.dispatchEvent(new DiceEvent('diceHover', dice, null));
      });
      this.element.on('mouseleave', '.dice:not(.detached)', (event) => {
        if (!game.ready) return;
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
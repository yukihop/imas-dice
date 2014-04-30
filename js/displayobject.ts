module cgdice {

  /**
   * Wraps HTML element as jQuery object
   */
  export class DomDisplayObject extends createjs.EventDispatcher {
    public element: JQuery;
    public canvas: JQuery = null;
    public stage: createjs.Stage = null;

    public useCanvas(className?: string) {
      this.canvas = $('<canvas>').appendTo(this.element);
      if (className) this.canvas.addClass(className);
      this.adjustCanvasSize();
      this.stage = new createjs.Stage(this.canvas[0]);

      createjs.Ticker.on('tick', () => {
        this.stage.update();
      });

    }

    public adjustCanvasSize() {
      if (!this.canvas) {
        return;
      }
      this.canvas
        .attr('width', this.element.width())
        .attr('height', this.element.height());
    }

    constructor(template: string);
    constructor(element: JQuery);
    constructor(element: any) {
      super();
      if (typeof element == 'string') {
        this.element = $('.' + element, $('#templates')).clone();
      } else {
        this.element = element;
      }
    }
  }

  export enum StatusType {
    AttackMultiply,
    Stun, // skip one turn
    Curse, // cannot use skill
    Poison, // reduce HP after each dice use
    Countdown // add another status after specified turns
  }

  export class Status {
    public owner: StatusClient;
    public remainingTurns: number = -1; // never resets
    public clearAfterBattle: boolean = false;
    public type: StatusType;
    public options: any;

    constructor(type: StatusType, remainingTurns: number = -1, clearAfterBattle = true, options: any = {}) {
      this.type = type;
      this.remainingTurns = remainingTurns;
      this.clearAfterBattle = clearAfterBattle;
      this.options = options;
    }

    public remove() {
      if (this.owner) {
        return this.owner.removeStatus(this);
      }
      return null;
    }
  }

  export class StatusClient extends DomDisplayObject {
    public status: Status[] = [];

    public statusChanged() {
      // abstract
    }

    public registerStatus(status: Status) {
      status.owner = this;
      this.status.push(status);
      this.statusChanged();
    }

    public findStatus(type: StatusType): Status[] {
      return this.status.filter(st => st.type == type);
    }

    public hasStatus(type: StatusType[]): boolean;
    public hasStatus(type: StatusType): boolean;
    public hasStatus(type: any): boolean {
      var types: StatusType[] = [];
      if (typeof type == 'number') {
        types = [type];
      } else {
        types = type;
      }
      return types.some(typ => this.status.some(st => st.type == typ));
    }

    public removeStatusType(type: StatusType): boolean {
      var before_length = this.status.length;
      this.status = this.status.filter(st => st.type != type);
      this.statusChanged();
      return (before_length != this.status.length);
    }

    public removeStatus(status: Status): Status {
      var idx = this.status.indexOf(status);
      if (idx != -1) {
        this.status.splice(idx, 1);
        this.statusChanged();
        return status;
      }
      return null;
    }

    private changeStatusAfterTurn(event) {
      if (this.status.length == 0) {
        return;
      }
      var newStatus: Status[] = [];
      this.status.forEach(status => {
        if (status.remainingTurns == -1) newStatus.push(status);
        else if (status.remainingTurns-- > 1) {
          newStatus.push(status);
        } else if (status.type == StatusType.Countdown) {
          newStatus.push(status.options.next);
        }
      });
      this.status = newStatus;
      this.statusChanged();
    }

    private clearStatusAfterBattle(event) {
      this.status = this.status.filter(status => !status.clearAfterBattle);
      this.statusChanged();
    }

    constructor(template: string);
    constructor(element: JQuery);
    constructor(element: any) {
      super(element);
      var listen = (this instanceof battles.Battle) ? this : game.battle;
      listen.on('turnEnd', this.changeStatusAfterTurn, this);
      listen.on('battleFinish', this.clearStatusAfterBattle, this);
    }

  }
}
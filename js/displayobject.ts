module cgdice {

  /**
   * Wraps HTML element as jQuery object
   */
  export class DomDisplayObject extends createjs.EventDispatcher {
    public element: JQuery;

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
    Poison // reduce HP after each dice use
  }

  export class Status {
    public owner: StatusClient;
    public remainingTurns: number = -1; // never resets
    public clearAfterBattle: boolean = false;
    public type: StatusType;
    public options: any;

    constructor(type: StatusType, options: any = {}) {
      this.type = type;
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

    public hasStatus(type: StatusType): boolean {
      return this.status.some(st => st.type == type);
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
      console.log('turn?');
      this.status = this.status.filter(status => {
        return (status.remainingTurns == -1 || status.remainingTurns-- > 1);
      });
    }

    constructor(template: string);
    constructor(element: JQuery);
    constructor(element: any) {
      super(element);
      var listen = (this instanceof battles.Battle) ? this : game.battle;
      listen.on('turnEnd', this.changeStatusAfterTurn, this);
    }


  }
}
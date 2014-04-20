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
}
module cgdice.titles {
  export class Title extends cgdice.DomDisplayObject {

    private menuClicked(event: JQueryMouseEventObject) {
      this.element.hide();
    }

    constructor() {
      super($('#title'));
      this.element.on(
        'click',
        '.main_menu',
        $.proxy(this.menuClicked, this)
      );
    }
  }
}
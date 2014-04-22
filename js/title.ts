module cgdice.titles {
  export class Title extends cgdice.DomDisplayObject {

    private menuClicked(event: JQueryMouseEventObject) {
      var data: any = application.loader.getResult('fieldData');
      game.reset(data[0]);
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

  export class StageSelector extends cgdice.DomDisplayObject {
    constructor() {
      super($('#stage_select'));
    }
  }
}
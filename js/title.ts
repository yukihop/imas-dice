module cgdice.titles {

  export class Title extends cgdice.DomDisplayObject {
    private menuClicked(event: JQueryMouseEventObject) {
      this.dispatchEvent('titleClose');
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
    private _data: any;

    constructor() {
      super($('#stage_select'));
      this.element.on('click', 'li', () => {
        var idx = $(event.target).index();
        game.reset(this._data[idx]);
        this.element.transition({
          opacity: 0,
          duration: 300,
          complete: () => { this.element.hide(); }
        });
      });
    }

    public reset() {
      var list = this.element.find('#stage_list');
      list.empty();
      this._data = <Array<any>>application.loader.getResult('fieldData');
      this._data.forEach((stage) => {
        $('<li>').text(stage.title).appendTo(list);
      });
      this.element.show().css({ opacity: 1 });
    }
  }
}
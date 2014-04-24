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
      this.element.on('click', 'li.stage', () => {
        var idx = $(event.target).index();
        var players: cgdice.characters.Character[];
        players = $('#character_list .selected').map((i, elem) => {
          return $(elem).data('self');
        }).get();
        $('#character_list .selected', this.element).removeClass('selected');

        if (players.length == 0) {
          alert('select someone'); return;
        }

        game.reset(this._data[idx], players);
        this.element.transition({
          opacity: 0,
          duration: 300,
          complete: () => { this.element.hide(); }
        });
      });

      this.element.on('click', '.character', (event) => {
        var target = $(event.target);
        target.toggleClass('selected');
        var p = <cgdice.characters.Character>$(event.target).data('self');
      });

      $('#character_list', this.element).sortable({
      });

    }

    public reset() {
      // stages
      var list = this.element.find('#stage_list');
      list.empty();
      this._data = <Array<any>>application.loader.getResult('fieldData');
      this._data.forEach((stage) => {
        $('<li>').addClass('stage').text(stage.title).appendTo(list);
      });

      // characters
      list = this.element.find('#character_list');
      list.empty();
      application.availableCharacters.forEach((p) => {
        $('<li>').append(p.element).appendTo(list);
      });

      this.element.show().css({ opacity: 1 });
    }
  }
}
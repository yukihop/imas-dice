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
      this.element.on('click', 'li.stage', (event) => {
        var idx = $(event.target).index();
        var players: cgdice.characters.Character[];
        players = $('#character_list .selected', this.element).map((i, elem) => {
          return $(elem).data('self');
        }).get();
        $('#character_list .selected', this.element).removeClass('selected');

        if (players.length == 0) {
          alert('select someone');
          return;
        }

        game.reset(this._data[idx], players);
        this.element.transition({
          opacity: 0,
          duration: 300,
          complete: () => { this.element.hide(); }
        });
      });

      this.element.on('click', '.character', (event) => {
        var target = $(event.currentTarget);
        target.toggleClass('selected');
        var p = <cgdice.characters.Character>$(event.target).data('self');
      });

      $('#character_list', this.element).sortable({
        distance: 10
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
      list.find('.character').detach(); // do not empty
      application.availableCharacters.forEach((p) => {
        p.resetHighlight();
        $('<li>').append(p.element.addClass('selected')).appendTo(list);
      });

      this.element.show().css({ opacity: 1 });
    }
  }

}
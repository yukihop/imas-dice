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

  var previousSelected: characters.Character[] = [];

  export class StageSelector extends cgdice.DomDisplayObject {
    private _data: any;

    private updateSelectedCount(): number {
      var selected_count = $('.character.selected', this.element).length;
      $('.selected_count', this.element).text(selected_count + '/5');
      return selected_count;
    }

    constructor() {
      super($('#stage_select'));
      this.element.on('click', 'li.stage', (event) => {
        var idx = $(event.target).index();
        var players: cgdice.characters.Character[];
        players = $('#character_list .selected', this.element).map((i, elem) => {
          return $(elem).data('self');
        }).get();
        previousSelected = players.slice(0); // duplicate
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
        var selected_count = $('.character.selected', this.element).length;
        if (target.hasClass('selected')) {
          if (selected_count <= 1) {
            return;
          }
          target.removeClass('selected');
          selected_count--;
        } else {
          if (selected_count >= 5) {
            return;
          }
          target.addClass('selected');
          selected_count++;
        }
        this.updateSelectedCount();
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

      application.availableCharacters.forEach((p, i) => {
        if (previousSelected.length == 0) {
          p.element.toggleClass('selected', i < 5);
        } else {
          p.element.toggleClass('selected', previousSelected.indexOf(p) >= 0);
        }
        $('<li>').append(p.element).appendTo(list);
      });
      this.updateSelectedCount();

      this.element.show().css({ opacity: 1 });
    }
  }

}
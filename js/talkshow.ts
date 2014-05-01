module cgdice.talks {
  /**
   * Talkクラスはダイアログとして表示される会話イベントを制御します。
   */
  export class Talk extends DomDisplayObject {
    static loaded: { [file_id: string]: JQuery } = {};

    private dialog: JQuery;
    private talk_index: number;
    private talks: JQuery;

    static DIALOG_MAX_HEIGHT = 300;

    static show(talkID: string, callback?: () => void) {
      var splitted = talkID.split('/');
      return new Talk(splitted[0], splitted[1], callback);
    }

    private doShow(item: JQuery) {
      if (!item || item.length == 0) {
        alert('Internal error: No matching dialog ID');
      }
      item = item.clone().appendTo(this.dialog);
      this.talks = item.children();
      this.talk_index = 0;
      this.dialog.on('click', () => {
        if (this.talk_index >= this.talks.length) {
          this.dialog.dialog('close');
          this.dialog.remove();
          this.callback && this.callback();
          this.dialog = null;
        } else {
          var elem = this.talks.eq(this.talk_index++);
          elem.animate({ left: 0 }, 200);
          if (elem.position().top + elem.height() > Talk.DIALOG_MAX_HEIGHT) {
            var scroll = elem.position().top + elem.height() - Talk.DIALOG_MAX_HEIGHT;
            $(this.dialog).scrollTop(scroll);
          }
        }
      });
      $(this.dialog).css({
        'max-height': Talk.DIALOG_MAX_HEIGHT + 'px',
        'top': '0',
        'color': 'pink'
      });
      $(this.dialog).closest('.ui-dialog').position({
        my: 'center',
        at: 'center',
        of: $('#gamemode')
      });
      this.dialog.click();
    }

    constructor(fileid: string, id: string, public callback?: () => void) {
      super('talkshow');
      this.dialog = $('<div>').dialog({
        dialogClass: 'talkshow',
        draggable: false,
        resizable: false,
        width: 400,
        maxHeight: Talk.DIALOG_MAX_HEIGHT,
        modal: true,
        closeOnEscape: false
      });
    if(fileid in Talk.loaded) {
      var item = Talk.loaded[fileid].children('.' + id);
      this.doShow(item);
      } else {
    $.ajax({
      url: 'talks/' + fileid + '.html',
      method: 'GET',
      success: (data) => {
        var result = $('<div>').html(data);
        Talk.loaded[fileid] = result;
        this.doShow(result.children('.' + id));
      },
      type: 'text'
    });
  }
    }
  }
}
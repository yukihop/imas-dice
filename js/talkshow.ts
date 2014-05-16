module cgdice {
  /**
   * Talkクラスはダイアログとして表示される会話イベントを制御します。
   */
  export class Talk extends DomDisplayObject {
    static loaded: { [file_id: string]: JQuery } = {};

    private dialog: JQuery;
    private talks: JQuery;
    private static shownID: { [id: string]: boolean } = {};

    static DIALOG_MAX_HEIGHT = 300;

    static resetShown() {
      Talk.shownID = {};
    }
    
    static show(talkID: string, callback?: () => void) {
      if (Talk.shownID[talkID]) {
        callback && callback();
        return;
      }
      Talk.shownID[talkID] = true;
      var splitted = talkID.split('/');
      return new Talk(splitted[0], splitted[1], callback);
    }

    private doShow(item: JQuery) {
      if (!item || item.length == 0) {
        alert('Internal error: No matching dialog ID');
      }
      item = item.clone().appendTo(this.dialog);
      this.talks = item.children();
      var talk_index = 0;
      var top = 0;
      this.dialog.on('click', () => {
        if (talk_index >= this.talks.length) {
          this.dialog.dialog('close');
          this.dialog.remove();
          this.callback && this.callback();
          this.dialog = null;
        } else {
          var elem = this.talks.eq(talk_index++);
          elem.animate({ left: 0 }, 200);
          if (top + elem.outerHeight() > Talk.DIALOG_MAX_HEIGHT) {
            var scroll = top + elem.outerHeight() - Talk.DIALOG_MAX_HEIGHT;
            $(this.dialog).scrollTop(scroll);
          }
          top += elem.outerHeight();
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
        closeOnEscape: false,
      });
      if (fileid in Talk.loaded) {
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

  export class Dialog {
    private _dialog: JQuery;

    static alert(message: string, callback?: () => void);
    static alert(message: JQuery, callback?: () => void);
    static alert(message: any, callback?: () => void) {
      var buttons = {
        OK: function() { $(this).dialog('close'); callback && callback(); }
      };
      new Dialog(message, buttons);
    }

    static confirm(message: string, callback?: (ok: boolean) => void);
    static confirm(message: JQuery, callback?: (ok: boolean) => void);
    static confirm(message: any, callback?: (ok: boolean) => void)  {
      var buttons = {
        'キャンセル': function() { $(this).dialog('close'); callback && callback(false); },
        OK: function() { $(this).dialog('close'); callback && callback(true); },
      }
      new Dialog(message, buttons);
    }

    constructor(message: any, buttons: any) {
      this._dialog = $('<div>').dialog({
        dialogClass: 'talkshow',
        draggable: false,
        resizable: false,
        width: 400,
        modal: true,
        buttons: buttons
      });
      this._dialog.append(message);
    }
  }
}
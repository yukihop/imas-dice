module cgdice.talks {
  /**
   * Talkクラスはダイアログとして表示される会話イベントを制御します。
   */
  export class Talk extends DomDisplayObject {
    static loaded: { [file_id: string]: JQuery } = {};

    private dialog: JQuery;
    private talk_index: number;
    private talks: JQuery;

    static show(fullid: string);
    static show(fileid: string, talkid: string);
    static show(fileid: string, talkid?: string) {
      if (talkid) {
        return new Talk(fileid, talkid);
      } else {
        var splitted = fileid.split('/');
        return new Talk(splitted[0], splitted[1]);
      }
    }

    private doShow(item: JQuery) {
      item = item.clone();
      if (!item || item.length == 0) {
        alert('Internal error: No matching dialog ID');
      }
      this.talks = item.children();
      this.talk_index = 0;
      this.dialog.on('click', () => {
        if (this.talk_index >= this.talks.length) {
          this.dialog.dialog('close');
          this.dialog = null;
        } else {
          var elem = this.talks.eq(this.talk_index++);
          this.dialog.append(elem);
          elem.animate({ left: 0 }, 200);
          $('.ui-dialog-content').scrollTop(9999);
        }
      });
      this.dialog.click();
    }

    constructor(fileid: string, id: string) {
      super('talkshow');
      this.dialog = $('<div>').dialog({
        dialogClass: 'talkshow',
        draggable: false,
        resizable: false,
        width: 400,
        height: 300,
        modal: true,
        closeOnEscape: false
      });
      if (fileid in Talk.loaded) {
        var item = Talk.loaded[fileid].find('.' + id);
        this.doShow(item);
      } else {
        $.ajax({
          url: 'talks/' + fileid + '.html',
          method: 'GET',
          success: (data) => {
            var result = $('<div>').html(data);
            Talk.loaded[fileid] = result;
            this.doShow(result.find('.' + id));
          },
          type: 'text'
        });
      }
    }
  }
}
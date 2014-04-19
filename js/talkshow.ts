module cgdice.talks {
  export class Talk extends DomDisplayObject {
    static loaded: { [file_id: string]: JQuery } = {};

    static show(fileid: string, id: string) {
      return new Talk(fileid, id);
    }

    private doShow(item: JQuery) {
      alert(item.text());
    }

    constructor(fileid: string, id: string) {
      super('talkshow');
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
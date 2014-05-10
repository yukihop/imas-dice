/**
 * characters.ymlファイルにスキル毎のIDを振るためのサポートスクリプトです。
 * 一旦決まったIDについては削除・変更しないでください。セーブファイルが壊れます。
 */

var fs = require('fs');
var md5 = require('MD5');

function addID()
{
  var fileName = __dirname + '/../settings/characters.yml';
  var content = fs.readFileSync(fileName, {
    encoding : 'UTF-8'
  });
  var lines = content.split(/\r?\n/);
  console.log('Processing ' + lines.length + ' lines.');
  var result = [];
  lines.forEach(function(line, i)
  {
    result.push(line);
    var m;
    if (m = line.match(/( {6,})name:\s*(.+)/))
    {
      if (i <= lines.length - 1 && lines[i + 1].match(/id/))
      {
        return;
      }
      console.log(m[2]);
      var hash = md5(m[2]).substring(0, 8);
      result.push(m[1] + 'id: ' + hash);
    }
  });
  fs.writeFileSync(fileName, result.join("\r\n"));
}

addID();
var ACCESS_TOKEN  = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
var CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
var calendar = CalendarApp.getCalendarById(CALENDAR_ID);


function insert_slash(date){
  var year = date.substr(0,4);
  var month = date.substr(4,2);
  var day = date.substr(6,2);
  var result = year + "/" + month + "/" + day;
  return result;
};

function formatDate(date, format){
  format = format.replace(/yyyy/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2));
  return format;
};

function formatTime(date, format){
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  return format;
};

function add_date(date, n){
  var new_date = new Date(date);
  new_date.setDate(new_date.getDate() + n);
  return new_date
};

function doPost(e){
  var replyToken = JSON.parse(e.postData.contents).events[0].replyToken; 
  var userMessage = JSON.parse(e.postData.contents).events[0].message.text;  
  var shifts = userMessage.split("\n");
  if (shifts.length != 8){
    reply_message(replyToken, '入力エラーです\n日付＋7日分の8行を入力してください');
    return;
  }
  var base_date = shifts.shift();
  if (base_date.split("/").length == 3)  base_date = new Date(base_date);
  if (base_date.split("/").length == 1)  base_date = new Date(insert_slash(base_date));  // 20200916 -> 2020/09/16
  if (base_date.toString() == "Invalid Date"){
    reply_message(replyToken, '入力エラーです\n日付は8桁のYYYYMMDDで入力してください');
    return;
  }
  var shift_pairs = [];
  shifts.forEach(function(shift, index){
    var default_end_time = "21:30";
    if (shift.split("-").length == 2){
      var [start_time, end_time] = shift.split("-");
      if (end_time.length == 0){
        end_time = default_end_time
      }
    }else if (shift.split("-").length == 1){
      var [start_time, end_time] = [shift.split("-")[0], default_end_time];
    }else{
      reply_message(replyToken, '入力エラーです\n各シフトの書式はhh:mm-hh:mmまたはhh:mm-もしくはhh:mmです');
      return;
    }
    if (start_time.length < 3){
      start_time = start_time + ":00"  // 17 -> 17:00
    }
    var start_date = new Date(formatDate(add_date(base_date, index), "yyyy/MM/dd ") + start_time);
    var end_date   = new Date(formatDate(add_date(base_date, index), "yyyy/MM/dd ") + end_time);
    if (shift != "" && "休み".indexOf(shift) == -1){
      shift_pairs.push([start_date, end_date]);
    }
  });
  shift_pairs.forEach(function(shift_pair){
    calendar.createEvent(formatTime(shift_pair[0], "hh:mm")+'~'+formatTime(shift_pair[1], "hh:mm"),
                         shift_pair[0], shift_pair[1]);
  });
  reply_message(replyToken, String("追加しました"));
}

function reply_message(token, replyText) {
 var url = "https://api.line.me/v2/bot/message/reply";
 var headers = {
   "Content-Type": "application/json; charset=UTF-8",
   "Authorization": "Bearer " + ACCESS_TOKEN
 };
 var postData = {
   "replyToken": token,
   "messages": [{
     "type": "text",
     "text": replyText
   }]
 };
 var options = {
   "method": "POST",
   "headers": headers,
   "payload": JSON.stringify(postData)
 };
 return UrlFetchApp.fetch(url, options);
}
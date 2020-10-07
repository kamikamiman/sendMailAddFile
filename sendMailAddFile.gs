//============================================================================================//
//                【全体】監視対象情報の取得・変数の宣言                                               //
//============================================================================================//

//  監視対象のフォルダのIDを取得
const folder = DriveApp.getFolderById("1ajr0xaE1T4TxOBmPfm5oCOMjcKs62-GX");
//  監視対象フォルダ(親)内のファイル情報を取得
const files = folder.getFiles();
//  監視対象フォルダ(親)内のフォルダ(子)情報を取得
const childFolders = folder.getFolders();


//  更新日時等を記録するスプレットシートのIDを取得
const sheetId = "14zC1SEGJ2wh3zn9n3cSUMXEUledeHZsjUM0UIub3oFg";
// スプレッドシートのシート名（下に表示されるタブ）
const sheetName2 = "folderList";
// スプレッドシートのシート名（下に表示されるタブ）
const sheetName3 = "fileList";
// スプレッドシートのシート名（下に表示されるタブ）
const sheetName4 = "childFileList";
// スプレッドシートに記載されているフォルダ名と更新日時を取得。
const spreadsheet = SpreadsheetApp.openById(sheetId);
const sheet2 = spreadsheet.getSheetByName(sheetName2);
const sheet3 = spreadsheet.getSheetByName(sheetName3);
const sheet4 = spreadsheet.getSheetByName(sheetName4);
const data = sheet2.getDataRange().getValues();

//  宛先
const SEND_MAIL_ADDRESS = "k.kamikura@isowa.co.jp"

//  送り主
const SENDER_MAIL_ADDRESS = "kamikurakenta@gmail.com"


//  フォルダ（親/子）内のファイル名リスト
let filesList = [];
//  フォルダ（子）内のファイルIDリスト
let filesIdList = [];
//  フォルダ（親）内のフォルダ名（子）リスト
let foldersList = [];
//  フォルダ内のデータ
let folderData = {};
//  アップデートするリスト
let updateFolderList = [];
//  取得したデータをMapに変換。
let sheetData = {};
//  フォルダ(子)内のファイル名リスト
let childFilesList = [];
//  フォルダ（親）内のアップデートリスト
let updateFileList = [];
//  フォルダ（子）内のアップデートリスト
let updateChildFileList = [];
//  削除されたフォルダリスト
let deleteFolderList = [];


//============================================================================================//
//            【メイン】各関数を実行する                                                             //
//============================================================================================//

function SendMailAddFile() {
  
  // フォルダ(親)内のファイル名を取得してスプレットシートを更新する
  getFiles();
  
  // フォルダ(親)内のフォルダ情報を取得してスプレットシートを取得する
  getChildFolders();

  
  // ログ確認用  
  Logger.log(foldersList);
  Logger.log("---------------");
  Logger.log(filesList);
  Logger.log("---------------");
  Logger.log(childFilesList);
  Logger.log("---------------");
  Logger.log(updateFolderList);
  Logger.log("---------------");
  Logger.log(updateFileList);
  Logger.log("---------------");
  Logger.log(updateChildFileList);
}


//============================================================================================//
//            【関数】フォルダ(親)内のファイル名を取得してスプレットシートを更新する                     //
//============================================================================================//

function getFiles() {
  //  ファイルがあったら１つずつファイル名を取得  
  while(files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    filesList.push(fileName);
  }   
}



//=============================================================================================//
//            【関数】フォルダ(親)内のフォルダ名とファイル名、ファイルIDを取得                          //
//=============================================================================================//

function getChildFolders() {
  //  フォルダ(子)があったら１つずつフォルダ名を取得
  while(childFolders.hasNext()) {                           // 次のフォルダがなくなるまで実行する
    filesIdList = [];                                       // ファイルIDリストをリセットする
    const childFolder = childFolders.next();                // 次のフォルダ情報
    const folderName = childFolder.getName();               // フォルダ名
    foldersList.push(folderName);                           // フォルダ名を配列[folderName]に代入
    const childFiles = childFolder.getFiles();              // フォルダ(子)内のファイル情報
    //  フォルダ(子)の最終更新日時を取得  
    let lastFolderUpdateDate = childFolder.getLastUpdated();      
    //　ファイル(子)内のファイル名を１つずつ取得    
    while(childFiles.hasNext()) {                           // 次のファイルがなくなるまで実行する
      const childFileName = childFiles.next();              // 次のファイル情報
      filesIdList.push(childFileName.getId());              // ファイルIDを配列[filesIdList]に代入
      childFilesList.push(childFileName.getName());         // ファイル名を配列[filesList]に代入
      //  フォルダ(子)よりファイル(子)の更新日時の方が新しかった場合    
      if(childFileName.getLastUpdated() > lastFolderUpdateDate) {
        //  フォルダ(子)の更新日時を更新する
        lastFolderUpdateDate = childFileName.getLastUpdated();
      }   
    }
    
    //  情報を連想配列に格納    
    folderData[folderName] = {
      name: folderName,
      lastUpdate: lastFolderUpdateDate,
      fileNumber: filesIdList.length,
      url: childFolder.getUrl(),
      diff: 0
    };
  } 
  
  //  フォルダ(親)内のフォルダ（子）情報
  for (let i = 1; i < data.length; i++) {
    sheetData[data[i][0]] = {
      name:          data[i][0],
      lastUpdate:    data[i][1],
      fileNumber:    data[i][2],
      url:           data[i][3],
      rowNo:         i + 1
    };
  }
  

  // フォルダ(親)内のフォルダ名とファイル、ファイルIDを取得  実際のフォルダとスプレッドシート情報を比較。
  function getChildFolderList() {
    for (key in folderData) {
      if (key in sheetData) {
        // フォルダ名がシートに存在する場合。
        if (folderData[key].fileNumber != sheetData[key].fileNumber) {
          // フォルダが更新されているか、ファイルが追加されている場合。
          updateFolderList.push(key);

          folderData[key].diff = folderData[key].fileNumber - sheet2.getRange(sheetData[key].rowNo, 3).getValue();
          //        Logger.log(key+", folderData[key].diff: " + folderData[key].diff);
          sheet2.getRange(sheetData[key].rowNo, 2).setValue(folderData[key].lastUpdate);
          sheet2.getRange(sheetData[key].rowNo, 3).setValue(folderData[key].fileNumber);
          sheet2.getRange(sheetData[key].rowNo, 4).setValue(folderData[key].url);
        }
      } else {
        // フォルダ名がシートに存在しない場合。
        let lowno = sheet2.getLastRow() + 1
        sheet2.getRange(lowno, 1).setValue(key);
        sheet2.getRange(lowno, 2).setValue(folderData[key].lastUpdate);
        sheet2.getRange(lowno, 3).setValue(folderData[key].fileNumber);
        sheet2.getRange(lowno, 4).setValue(folderData[key].url);
        updateFolderList.push(key);
      }
    }
  }
  
  //--------------------------------------------------------------------------------------------//
  //           【関数】メール送信（変更内容を通知）                                                       //
  //--------------------------------------------------------------------------------------------//
  
  function sendGmail() {
    
    Logger.log(updateFileList.length);
    
    // 削除されたフォルダをチェックして、フォルダ一覧から削除
    for (key in sheetData) {
      if (!(key in folderData)) {
        Logger.log(key + " is deleted. row" + sheetData[key].rowNo)
        sheet2.deleteRow(sheetData[key].rowNo)
        deleteFolderList.push(key);
      }
    }
    
    // 新規及び更新された情報をメール送信
    if (updateFileList != 0 | updateFolderList.length != 0 | deleteFolderList.length != 0) {
      
      if (updateFolderList.length != 0 | deleteFolderList.length != 0) {
        bodyText = folder.getName() + "フォルダに、" + updateFolderList.length + "個のファイルが追加・削除されました。\n";
        bodyText += folder.getUrl() + "\n\n";
      }
            
      // フォルダ名、フォルダ更新日時、フォルダ内のファイル数
      if (updateFolderList != 0) {
        bodyText += "フォルダ名        \t枚数\tURL\n";
        for (key in updateFolderList) {
          fld = updateFolderList[key];
          bodyText += fld + "\t" + folderData[fld].fileNumber;
          if (folderData[fld].diff != 0) {
            //変更されたフォルダがある場合
            bodyText += "(" + folderData[fld].diff + ")";
          }
          bodyText += "枚" + "\t" + folderData[fld].url + "\n";
        }
        
        updateChildFileList.forEach (updateChildFile => {
          bodyText += "ファイル名 ： " + updateChildFile + "\n";
        });
          
      }
      
      if (deleteFolderList != 0) {
        bodyText += "\n以下のフォルダが削除されています。" + "\n";
        for (key in deleteFolderList) {
          fld = deleteFolderList[key];
          bodyText += fld + "\t" + sheetData[fld].filenumber + "枚" + "\n";
        }
      }
      
      if (updateFileList.length != 0) {
        bodyText = updateFileList.length + "個のファイルが追加されました。\n";
        bodyText += folder.getUrl() + "\n\n";
        
      　updateFileList.forEach (updateFile => {
        　bodyText += "ファイル名 ： " + updateFile + "\n";
        });
      }

      
      bodyText += "\n\nこのメールに返信しても見れませんので返信しないでください。";
      // Logger.log(bodyText)
      
      let titletext = "【" + folder.getName() + "】更新連絡通知";
      MailApp.sendEmail(SEND_MAIL_ADDRESS, SENDER_MAIL_ADDRESS, titletext, bodyText);

      } else {
        Logger.log("通知する更新情報がありません")
        }
  }
  
  //--------------------------------------------------------------------------------------------//
  //         関数の実行                                                                           //
  //--------------------------------------------------------------------------------------------//
  
  // フォルダ(親)内のフォルダ名とファイル名、ファイルIDを取得
  getChildFolderList(); 
  
  // フォルダ(親)内のファイル名を取得してスプレットシートを更新する
//  getFileList(sheet3, filesList, updateFileList);
  
  // フォルダ(子)内のファイル名を取得してスプレットシートを更新する
  getFileList(sheet4, childFilesList, updateChildFileList);
  
  // メール送信（変更内容を通知）
  sendGmail();
    
}
  
  
  
//=============================================================================================//
//             【関数】フォルダ(親/子)内のファイル名を比較してスプレットシートを更新する                          //
//=============================================================================================//
  
  function getFileList(sht, flt, upflt) {
    
    
    //  シートの最終行に最新のファイルリストを追加する。
    sht.appendRow(flt);
    //  シートの1行目のファイルリストを取得する。
    let _getCFLists1 = sht.getRange(1, 1, 1, flt.length).getValues();
    let getCFLists1 = _getCFLists1.flat();
    
    
    
    //  最新のファイルリストと1行目のファイルリストを比較する。
    flt.forEach(fileList => {
      if(getCFLists1.indexOf(fileList) == -1) {
        upflt.push(fileList);
//        Logger.log(upflt);
      } else {
      //        Logger.log(fileList)
    }
  });
//Logger.log(upflt);

    // シートの１行目を削除する。
    sht.deleteRow(1);
  }


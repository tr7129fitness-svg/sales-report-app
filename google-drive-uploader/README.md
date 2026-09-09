# 料金表PDFのGoogle Drive保存

このスクリプトは、営業結果レポートで選んだ料金表PDFを、次のGoogle Driveフォルダへ保存します。

- フォルダ名: `営業報告アプリ_料金表`
- フォルダID: `1epPdI7icyX07qxD6QNV9-MtwqLx_bSQE`

## 設定

1. Google Apps Scriptで新しいプロジェクトを作成し、`Code.gs` の内容を貼り付けます。
2. 左の歯車から **スクリプト プロパティ** を開きます。
3. 次のプロパティを追加します。

| プロパティ | 値 |
| --- | --- |
| `PRICE_LIST_UPLOAD_KEY` | 英数字32文字以上の任意の文字列 |

4. **デプロイ** → **新しいデプロイ** → 種類を **ウェブアプリ** にします。
5. **次のユーザーとして実行** は自分、**アクセスできるユーザー** は「全員」を選択します。
6. 発行された末尾が `/exec` のURLをコピーします。
7. `firebase-config.js` の次の値を設定して、GitHub Pagesへ公開します。

```js
export const driveUploadSettings = {
  endpoint: "https://script.google.com/macros/s/…/exec",
  uploadKey: "スクリプトプロパティと同じ文字列",
};
```

## 使い方

1. 営業報告を入力します。
2. 「料金表」でPDFを選び、**Google Driveへ保存** を押します。
3. 保存完了後に表示されたリンクを確認します。
4. 報告全体を保存すると、その営業報告の詳細に料金表リンクが表示されます。

PDFは15MBまでです。編集や削除をしても、Google Drive上のPDF原本は削除されません。

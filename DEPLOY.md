# 無料公開手順

このWebアプリはHTML/CSS/JavaScriptだけで動くため、GitHub Pagesで無料公開できます。Firebase設定を入れると、Firestoreに共有保存されます。

## Firebase共有保存を設定する

1. Firebase Consoleで無料のSpark planのプロジェクトを作成する
2. Webアプリを追加して、Firebase configuration objectを取得する
3. Firestore Databaseを作成する
4. `firestore.rules` の内容をFirestore Rulesに反映する
5. `firebase-config.js` の空欄をFirebase configuration objectの値で埋める

Firestoreの無料枠は、Standard editionで保存1GiB、1日あたり読み取り50K、書き込み20K、削除20Kまで無料枠があります。小規模な営業報告アプリなら、通常は無料枠内で運用できます。

注意: `firestore.rules` はログインなしで読み書きできる公開ルールです。URLを知っている人なら編集できるため、社外にURLを広げない運用にしてください。より安全にする場合は、Googleログインや匿名認証を追加します。

## GitHub Pagesで公開する

1. GitHubで新しいpublic repositoryを作成する
2. `outputs` フォルダ内のファイルをリポジトリ直下へアップロードする
   - `index.html`
   - `styles.css`
   - `app.js`
   - `firebase-config.js`
   - `.nojekyll`
3. GitHubのリポジトリで `Settings` → `Pages` を開く
4. `Build and deployment` のSourceを `Deploy from a branch` にする
5. Branchを `main`、Folderを `/root` にして保存する
6. 数分後に `https://ユーザー名.github.io/リポジトリ名/` で公開される

## 無料運用の注意

- 無料で使うにはpublic repositoryにする
- このアプリはデータベースを使わないため、入力データは利用者ごとのブラウザ内に保存される
- 社員全員で同じデータを共有したい場合は、後でGoogle Sheets連携などを追加する

# デプロイ手順

このWebアプリはGitHub Pagesで公開し、共有保存にはFirebase Firestoreを使います。

## Webアプリ

`sales-report-app-publish` はGitHub Pagesで公開する静的ファイルです。

```sh
cd sales-report-app-publish
git status
git add .
git commit -m "Add web push notification support"
git push
```

## Firebase共有保存

Firestoreのルールは `sales-report-app-publish/firestore.rules` にあります。

```sh
firebase deploy --only firestore:rules
```

現在のルールはGoogleログインと初回の管理者承認を必須にします。管理者は `tr7129.fitness@gmail.com` です。承認は `members/{uid}` に永続保存され、再ログイン時やアップロード時の再承認は不要です。承認済みユーザーは全報告を閲覧・登録・編集でき、利用停止後はアクセスできません。

Firebase AuthenticationでGoogleログインを有効にし、承認済みドメインへ `tr7129fitness-svg.github.io` を追加してください。公開時はFirestoreルール、Apps Scriptの最新版、静的ファイルの順に反映します。

## 料金表PDF・画像

料金表のPDF・画像のGoogle Drive保存には、`google-drive-uploader/README.md` の手順でApps Script Webアプリを作成します。
発行された`/exec` URLを `firebase-config.js` の `driveUploadSettings` へ設定してから、WebアプリをGitHub Pagesに公開してください。認証にはFirebase IDトークンを使い、共有秘密キーは公開ファイルに含めません。

## プッシュ通知

Web Pushを使う場合はFirebase Blazeプランが必要です。通常の営業報告件数なら無料枠内に収まる見込みですが、Google Cloud側で予算アラートを設定してください。

### 1. VAPIDキーを生成

```sh
npx web-push generate-vapid-keys
```

出力された公開鍵を `sales-report-app-publish/firebase-config.js` の `webPushPublicKey` に設定します。秘密鍵はリポジトリに入れません。

### 2. Functions設定を用意

`functions/.env.example` を参考に、`functions/.env` を作成します。

```sh
WEB_PUSH_PUBLIC_KEY=生成した公開鍵
WEB_PUSH_CONTACT_EMAIL=tr7129@icloud.com
APP_URL=https://tr7129fitness-svg.github.io/sales-report-app/
```

秘密鍵はSecretとして登録します。

```sh
firebase functions:secrets:set WEB_PUSH_PRIVATE_KEY
```

### 3. Functionsをデプロイ

```sh
firebase deploy --only functions,firestore:rules
```

### 4. iPhoneで有効化

Safariで公開URLを開き、共有メニューからホーム画面に追加します。追加したホーム画面アプリを開いて、`通知を許可` を押します。

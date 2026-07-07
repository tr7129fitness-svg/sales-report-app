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

現在のルールはログインなしで読み書きできる公開ルールです。URLを知っている人なら編集できるため、社外にURLを広げない運用にしてください。

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

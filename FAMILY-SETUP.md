# Benji family viewing — one-time setup

This update adds a **view-only** parent dashboard. Each parent has their own sign-in. Neither parent approves the other’s actions, and neither parent can edit Benji’s shared progress. Benji’s paired browser publishes the checkmarks. The dashboard shows what he marked, not independent proof of completion. In-game parent confirmations are local prompts, not remote approvals.

## Connect the family storage

1. Open https://console.firebase.google.com/ and create a project on the free **Spark** plan. Google Analytics is not needed. No service-account keys are needed.
2. Under **Build → Authentication → Get started → Sign-in method**, enable **Email/Password** and **Anonymous**. Anonymous authentication is for Benji’s paired device; parents use verified email accounts.
3. In Authentication settings, add `candid-chebakia-107300.netlify.app` as an authorized domain.
4. Under **Build → Firestore Database**, create a database in **production mode**. Select a region convenient for your family.
5. In Firestore’s **Rules** tab, replace the default rules with the supplied `firestore.rules` and publish them. Do not use test-mode/open rules. If database access is denied, fix the published rules or account verification; do not remove access checks.
6. In **Project settings → General → Your apps**, register a **Web app**. Copy its public `firebaseConfig` object into `firebase-config.js`, replacing `null`. Keep the form `window.BENJI_FIREBASE_CONFIG = { ... };`. This web configuration is public; never provide an admin/service-account key or password.
7. Upload the updated website files to the existing Netlify project. Keep the existing website address so Benji’s browser retains its progress. Open the app online and reload once if the older cached version appears.

## Connect the two parents and Benji

1. On the first parent’s phone, open **Parents → Create parent account**, verify the email, and tap **I verified my email**. Create the family.
2. Under **Family connections**, add the second parent’s email. Share the **Family ID** with that parent. Each parent uses their own verified email/password account. The second parent selects **Open family** with that ID. Once connected, both can view independently.
3. On Benji’s existing browser/device, export his progress in **Settings** as a backup first.
4. On the first parent’s dashboard, copy the private, one-time **device code**. On Benji’s browser choose **Parents → Connect Benji’s device**, using that code. Keep the code private; it grants permission to send progress for the family. It is consumed once.
5. If a shared snapshot already exists, the app restores it before sending further updates; the previous local state is backed up in that browser under `benji_before_family_sync`. Keep the exported backup too. Only one child browser is connected at a time.
6. Benji uses the game normally. Parents sign in and view his latest received checkmarks and the past seven days. Changes sync while Benji’s app is open and online; offline changes remain on his device until a later successful sync. The dashboard labels cached data and the last received update time.

The first parent can change the invited email or replace the child device code under **Family connections**. Replacing a device code disconnects the old child browser. If Benji clears browser data or switches browser, generate a replacement code and reconnect. A parent signing out does not delete shared progress.

## What has and has not been verified

The local game and unconfigured dashboard can be checked without a Firebase account. Successful cross-device sync, authentication, database rules enforcement and free-plan availability must be verified against the configured Firebase project before treating family viewing as ready. No project or accounts have been created automatically, and no current progress has been uploaded.

Before relying on the dashboard, test with two separate parent accounts and one paired child browser: make a task checkmark on the child, confirm it appears on each parent dashboard, verify the second parent cannot access a different family ID, and confirm parent accounts cannot write the progress document. Also test offline/reconnect on the child. Parent passwords belong only in the app’s secure sign-in form, never in chat or configuration files.

# Steps from Apple Health

Websites can't read Apple Health directly, so Forge gets your steps through a small iPhone Shortcut. The Shortcut reads the last 7 days of steps from Health and copies them; Forge then pastes them in. Set it up once, then updating takes a few taps.

## Set up the Shortcut (once)

1. Open the **Shortcuts** app and tap **+**. Name the shortcut **Forge Steps**, spelled exactly like that, so Forge can run it.
2. Add the action **Find Health Samples**.
   - Set the type to **Steps**.
   - Tap **Add Filter** and set it to **Start Date is in the last 7 days**.
   - Set **Group By** to **Day**. This gives one total per day that matches the Health app, without counting iPhone and Apple Watch steps twice.
3. Add **Repeat with Each**. Inside the repeat, add a **Text** action:
   - insert the **Repeat Item** variable, tap it and choose **Start Date**, with the **ISO 8601** date format,
   - type a space,
   - insert **Repeat Item** again and choose **Value**.
4. After **End Repeat**, add **Copy to Clipboard**.
5. Tap ▶ to run it once and allow access to Health.

Each line it copies looks like `2026-10-27T00:00:00-05:00 8432`.

## Updating your steps

1. In Forge, tap the **Steps** card on Home (or **Update** next to Steps on Progress).
2. Tap **Get steps from Apple Health**. The Shortcuts app opens and runs **Forge Steps**.
3. Go back to Forge with the **◀** back link in the top-left corner.
4. Tap **Paste steps**, then **Paste** when iOS asks.

Forge fills in every day the Shortcut copied, so missing a few days is fine. If you'd rather run the Shortcut from your Home Screen, a widget or an automation, just open Forge afterwards and tap **Paste steps**.

You can also type steps in by hand from the same screen, and set your daily goal there or in **Settings**.

## Troubleshooting

- **"No steps on the clipboard"**: run the Shortcut first, and check its last action is **Copy to Clipboard**.
- **Shortcuts says it can't find the shortcut**: the name must be exactly `Forge Steps`.
- **Totals look too high**: make sure **Group By** is set to **Day** in step 2.
- A Shortcut that copies a single number (for example today's total from **Calculate Statistics**) also works; Forge saves it as today's steps.

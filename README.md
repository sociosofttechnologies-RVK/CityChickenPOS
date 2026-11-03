# City Chicken Mutton Center POS

React point-of-sale for the shop counter. Reads weight from the HMS-C scale over USB, prints receipts on the TVS RP 3200 Lite, and keeps all data as XML files: products and settings in `src/data`, daily bills in `transactions`.

## What you need on the shop PC

| Item | Why |
|---|---|
| Windows PC with Google Chrome (or Edge) | The till runs in Chrome; Chrome reads the scale's USB port |
| Node.js 18 or newer (nodejs.org, LTS installer) | Runs `server.js`, which writes the XML files |
| TVS RP 3200 Lite Windows driver | From the TVS Electronics support site or the driver CD |

## First-time setup

1. Unzip this folder anywhere, e.g. `C:\citychicken-pos`.
2. Install the TVS printer driver, then in Windows **Settings > Printers & scanners** set **TVS RP 3200 Lite** as the default printer. In its Printing preferences choose the 80 mm roll paper size.
3. Plug the scale's USB cable into the PC. Open **Device Manager > Ports (COM & LPT)** and check that a new COM port appears. If nothing appears, install the USB-serial driver the scale supplier provides (commonly CH340 or PL2303).
4. Double-click `start.bat`. The till opens in its own window.
5. Go to **Settings > Weighing machine**, press **Connect scale**, and pick the COM port from step 3. Chrome remembers it; from then on it reconnects by itself.
6. Put a known weight on the pan and check the raw data box in Settings:
   - Readable numbers: done.
   - Garbled characters: change the baud rate, unplug and replug the cable, connect again.
   - Weight is 1000x too large: set "Scale sends weight in" to Grams.
7. Press **Print test receipt** in Settings to confirm the printer.

The built app is already in `dist`, so `npm install` is not needed to run it.

## Daily use

Start with `start.bat`. Pick a product, the weight fills in from the scale, **Add to bill**, then **Preview and print**. Check the receipt preview and press **Print receipt**; the bill is saved at that moment. **Back to bill** returns without saving. Items sold by piece ask for a count and ignore the scale.

If the scale is not connected, a weight box appears after you pick a product: type the weight in kg and add it to the bill. The scale's 5 g step, 100 g minimum and 30 kg capacity still apply.

## Data files

| File | Contents |
|---|---|
| `src/data/products.xml` | Products, prices, stock flag, images |
| `src/data/config.xml` | Shop details, printer and scale settings |
| `transactions/bills-YYYY-MM-DD.xml` | One file per day with every bill; the Bills and Reports screens read these |
| `product-images/` | Real product photos, matched to products by file name |

The files are created on first run and rewritten on every change. Back up both folders to keep your records. Bill files left in `src/data` by the earlier version are moved to `transactions` automatically on start.

## Product photos

Products without a photo show a drawing chosen from the product name. Two ways to use real photos:

| Way | How |
|---|---|
| Photo folder | Put a file in `product-images` named after the product, e.g. `chicken-curry-cut.jpg`. The full list of names is in `product-images/_FILE-NAMES.txt`. Press F5 in the till. |
| Upload | **Products > Change** on any product. This photo wins over the folder. |

The starting catalogue has 30 sample products with sample prices. Edit, remove or mark them out of stock in the **Products** tab.

## TV screen

The **TV Preview** tab in the till controls what the shop TV shows, and has a live preview with a **Maximize** button.

| Step in the loop | Length | Source |
|---|---|---|
| Opening video | 10 s | The video uploaded in TV Preview (plays without sound). With no video, the shop name shows for 4 s. |
| Offer slide 1 | 3 s | First uploaded offer image |
| Menu | 3 s per type | Products in stock, one slide per type (two slides if a type has more than 12 items) |
| Offer slide 2 | 3 s | Second offer image, then the menu again. More offers extend the loop the same way. |

All three lengths can be changed in TV Preview. Uploads, price changes and stock changes reach the TV by themselves within one loop.

| To show it on | Do this |
|---|---|
| A smart TV on the same Wi-Fi | Type the address shown in TV Preview (like `http://192.168.1.20:4310/tv`) into the TV's browser, press OK on "Full screen", then use the browser's "Add to home screen" or bookmark to keep an icon on the TV. |
| A TV plugged into this PC by HDMI | Double-click `tv-preview.bat`. |
| Desktop icons | Run `create-desktop-shortcuts.bat` once: it adds "City Chicken Till" and "City Chicken TV Preview" to the Desktop. |

The first time the service starts, Windows asks whether to allow Node.js on the network: choose **Allow** on private networks, or the TV cannot connect. The TV (and any other device on the Wi-Fi) can only view the TV screen; it cannot change anything or read bills. The till PC must stay on, and its address can change if the router restarts.

Files live in `tv-media` (`video.mp4`, `background.jpg`, and the `offers` folder).

## Changing the code

```
npm install
node server.js        (terminal 1)
npm run dev           (terminal 2, live reload)
npm run build         (rebuilds dist for the shop PC)
```

| File | Role |
|---|---|
| `src/App.jsx` | Screens: Billing, Products, Bills, Reports, Settings |
| `src/Tv.jsx`, `src/tv.css` | TV Preview tab and the TV screen at `/tv` |
| `src/samples.js` | Sample product drawings |
| `src/styles.css` | Colours and layout (lemon yellow, red, maroon from the shop branding) |
| `src/assets/` | Shop logo and banner; replace the files and rebuild to change them |
| `src/useScale.js` | Scale reading over Web Serial |
| `src/lib.js` | XML read/write, starting data |
| `server.js` | Serves the app and writes XML to `src/data` and `transactions` |

## Not yet verified on the real hardware

- The HMS-C data format and baud rate are assumed (continuous text at 9600 baud). The Settings screen lets you correct both.
- If the scale's USB port does not show up as a COM port, tell the developer what Device Manager shows.

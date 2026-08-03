# Fairway Caddie — Personal iPhone PWA

This is the first usable version of your personal golf application.

## Included

- Installable iPhone web app
- Live GPS location on an OpenStreetMap map
- Manual green-centre placement
- Distance from your current position to the green
- Club recommendation using your saved club ranges
- Shot start and finish recording
- Shot distance and direction calculation
- Local club-distance learning
- Local backup and restore
- No server, account, database or paid licence required

Your starting club ranges are already included:

- Driver: 240–260 yd
- 3 Wood: 220–240 yd
- 5 Wood: 200–220 yd
- 4 Iron: 180–200 yd
- 5 Iron: 175–185 yd
- 6 Iron: 170–180 yd
- 7 Iron: 160–175 yd
- 8 Iron: 150–165 yd
- 9 Iron: 135–150 yd
- Pitching Wedge: 125–135 yd
- Gap Wedge: 105–120 yd
- 56° Wedge: 10–100 yd


## Important: the downloaded HTML preview is not the running app

Opening `index.html` inside ChatGPT's file preview, a ZIP preview, or some phone file viewers may show the screen but block JavaScript. In that case the buttons and tabs will not respond.

The app must be opened from an HTTPS web address after it is published through GitHub Pages or another HTTPS host.

## Test on a computer

From this folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

GPS may not work on a desktop without location hardware. Browser geolocation works on localhost for testing.

## Put it on your iPhone for free

The app must be hosted over HTTPS for iPhone location access and Home Screen installation.

### GitHub Pages

1. Create a free GitHub account and a new repository.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Open the HTTPS address GitHub provides.
7. On the iPhone, open that address in Safari.
8. Tap **Share → Add to Home Screen**.
9. Open the new icon and allow location access while using the app.

Do not upload the containing `fairway-caddie-pwa` folder as one nested folder unless you configure Pages for it. Upload the files inside it.


## Blank map

A blank map normally means the app is being viewed inside ChatGPT, a ZIP preview, the iPhone Files app, or another file viewer. Those views may display the HTML layout but block the external map library and map tiles.

The map works only after the app files are published to an HTTPS web address and that address is opened in Safari. OpenStreetMap tiles also require an internet connection.

## First on-course use

1. Open **Settings** and enter the course name.
2. Select the hole, par and tee.
3. Wait until the GPS status says **GPS live**.
4. Tap **Set green**, then tap the centre of the green on the map.
5. Review the recommended club.
6. Tap **Start shot** before hitting.
7. Walk to your ball and tap **At ball**.
8. The recorded distance is saved locally and may be accepted into the club-learning model.

## Current limitations

- The app does not yet contain mapped tee boxes, greens, hazards or complete course geometry.
- You manually mark the green centre for the current hole.
- GPS measures start-to-finish total distance, not carry distance.
- Map tiles require internet access; the app shell and saved data work offline.
- Recommendation logic is an initial rules-based model.
- Data is stored in the browser. Use **Shots → Export** to make backups.

## Suggested next development step

Create a course editor and save all 18 green centres, tee boxes and hazards for one course. After that, the app can identify the current hole automatically and give better strategic recommendations.

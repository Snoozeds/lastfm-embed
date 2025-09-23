# lastfm-embed

Easy-to-use and customisable embeds for last.fm that you can use on your website, or elsewhere.

---

## Demo Images

| Top Artists | Top Tracks | Top Albums |
|-------------|------------|------------|
| ![](/wiki/top-artists.png) | ![](/wiki/top-tracks.png) | ![](/wiki/top-albums.png) |

| Currently Playing | Stats |
|-------------------|------------|
| ![](/wiki/currently-playing.png) | ![](/wiki/stats.png)

</div>


---

## Parameters Reference

| Parameter        | Endpoint             | Type       | Default       | Description |
|-----------------|--------------------|-----------|---------------|-------------|
| `user`          | All                | string    | —             | Last.fm username *(required)* |
| `lang`          | All                | string    | `en`          | [ISO-639](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes#Table) (set 1) code for the language the embed should be in. Currently supports:<br>`en`, `de`
| `theme`         | All                | string    | `default`     | Theme to style the embed |
| `borderSize     | All                | number    | `0`           | Size of the border to put around the embed (in px). Max of 20px.
| `showTitle`     | All                | boolean   | `true`        | Whether to show the title of the embed (e.g "Top Tracks") or not.
| `limit`         | `top-tracks`, `top-albums`, `top-artists`       | number    | `5`           | Number of tracks/albums/artists to display (1–50) |
| `period`        | `top-tracks`, `top-albums`, `top-artists`        | string    | `overall`     | Time range for top tracks/albums/artists: `overall`, `7day`, `1month`, `3month`, `6month`, `12month` |
| `layout`        | `top-tracks`, `top-albums`, `top-artists`        | string    | `vertical`    | Display style: `vertical` or `horizontal` |
| `rows`          | `top-tracks`, `top-albums`, `top-artists`  vertical | number | `0`           | Number of rows in vertical layout (0 = auto) |
| `columns`       | `top-tracks`, `top-albums`, `top-artists`  vertical | number | `0`           | Number of columns in vertical layout (0 = auto) |
| `itemsPerRow`   | `top-tracks`, `top-albums`, `top-artists`  horizontal | number | `5`           | Number of tracks per row in horizontal layout |
| `usePlaceholderImage` | `top-artists` | boolean | `false` | When `true`, shows Last.fm's placeholder images for artists (as the API only provides that).<br>When `false`, displays the ranking number instead of an image.
| `numberFormat` | `stats` | string | `commas` | When `commas`, numbers are displayed like `123,456.78`.<br>When `periods`, numbers are displayed like `123.456,78`.

---

## Usage

Go to the [main page](https://lastfm-embed.vercel.app/), generate your embed, and then embed it on your website using an iframe. For example:
```html
<iframe src="https://lastfm-embed.vercel.app/api/top-tracks?user=Snoozeds"></iframe>
```

I use this on [my own website](https://snoozeds.com), so you can see it being used there at the bottom as well.

---

## Installation

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSnoozeds%2Flastfm-embed)

Environment variables:
```
LASTFM_API_KEY= # https://www.last.fm/api/account/create
PORT=3000

RATE_LIMIT_WINDOW_MS=60,000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=25 # max of 25 requests per minute

MAX_ARTISTS=50
MIN_ARTISTS=1

MAX_TRACKS=50
MIN_TRACKS=1

MAX_ALBUMS=50
MIN_ALBUMS=1

MAX_ROWS=10
MIN_ROWS=1

MAX_COLUMNS=5
MIN_COLUMNS=1

MAX_ITEMS_PER_ROW=10
MIN_ITEMS_PER_ROW=1
```

---

## i18n

This project supports i18n in the embeds. Currently `en` (default), and `de` are supported.

> [!NOTE]
> If you wish to open a [pull request](https://github.com/Snoozeds/lastfm-embed/pulls) to add i18n, you only *need* to do step 1.
### Steps:

1. Create a .json file in `/src/locales`, with the name matching the 2 letter code (set 1) from the [ISO-639 list](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes#Table). Check `en.json` for the original strings.

2. After that, update `/src/utils/i18n.js` to import your i18n file and use it.
```js
import en from "../locales/en.json" with { type: "json" };
import de from "../locales/de.json" with { type: "json"};
// import here

const locales = {
    en,
    de, // make sure to add comma
    // add 2 letter code here
};
```

3. Edit `/public/index.html` to add the language.
```html
 <label class="flex flex-col text-sm">
                Language
                <select id="lang" class="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1">
                    <option value="en" selected>English</option>
                    <option value="de">Deutsch</option>
                    <!-- Add lang here-->
                </select>
            </label>
```

## Contributors
Thanks to my good friend [Flower](https://x.com/xfreshcutflower) for doing the German translation.

---

## Custom Themes

You can add your own themes to customize the look of the embed.

### Steps:

1. Edit `/src/lib/themes.js` and add your theme.
```css
myTheme: { bg: "#ffff", text: "#000000", url: "#0000ffff", scrobble: "#ffff" }
```

> Each theme supports:  
> - `bg` - Background color  
> - `text` - Text color  
> - `url` - Links and highlight color  
> - `scrobble` - Secondary text (scrobble count) color

---

## Notes

- All tracks in the preview can use last.fm's **default image** (`/public/images/default.jpg`) if a real album cover is not available.
- The `/stats` endpoint's 'streak' caps out at 1 year, and will display '1 year+' if reached, because I don't want to completely overwhelm last.fm's api, or my own.  

---

## License

MIT © Snoozeds

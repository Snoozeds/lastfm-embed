# lastfm-embed

Easy-to-use and customisable embeds for last.fm that you can use on your website, or elsewhere.

---

## Demo Images

| Top Artists | Top Tracks | Top Albums |
|-------------|------------|------------|
| ![](/wiki/top-artists.png) | ![](/wiki/top-tracks.png) | ![](/wiki/top-albums.png) |

<div align="center">

| Currently Playing |
|-------------------|
| ![](/wiki/currently-playing.png) |

</div>


---

## Parameters Reference

| Parameter        | Endpoint             | Type       | Default       | Description |
|-----------------|--------------------|-----------|---------------|-------------|
| `user`          | All                | string    | —             | Last.fm username *(required)* |
| `theme`         | All                | string    | `default`     | Theme to style the embed |
| `showProfile`   | All                | boolean   | `true`       | Show username in the embed (`true` / `false`) |
| `limit`         | `top-tracks`, `top-albums`, `top-artists`       | number    | `5`           | Number of tracks/albums/artists to display (1–50) |
| `period`        | `top-tracks`, `top-albums`, `top-artists`        | string    | `overall`     | Time range for top tracks/albums/artists: `overall`, `7day`, `1month`, `3month`, `6month`, `12month` |
| `layout`        | `top-tracks`, `top-albums`, `top-artists`        | string    | `vertical`    | Display style: `vertical` or `horizontal` |
| `rows`          | `top-tracks`, `top-albums`, `top-artists`  vertical | number | `0`           | Number of rows in vertical layout (0 = auto) |
| `columns`       | `top-tracks`, `top-albums`, `top-artists`  vertical | number | `0`           | Number of columns in vertical layout (0 = auto) |
| `itemsPerRow`   | `top-tracks`, `top-albums`, `top-artists`  horizontal | number | `5`           | Number of tracks per row in horizontal layout |
| `usePlaceholderImage` | `top-artists` | boolean | `false` | When `true`, shows Last.fm's placeholder images for artists (as the API only provides that). When `false`, displays the ranking number instead of an image.

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

## Custom Themes

You can add your own themes to customize the look of the embed.

### Steps:

1. Edit `/src/lib/themes.js` and add your theme.
```css
myTheme: { bg: "#ffff", text: "#000000", url: "#0000ffff", scrobble: "#ffff" },
````

> Each theme supports:  
> - `bg` - Background color  
> - `text` - Text color  
> - `url` - Links and highlight color  
> - `scrobble` - Secondary text (scrobble count) color

---

## Notes

- All tracks in the preview can use last.fm's **default image** (`/public/images/default.jpg`) if a real album cover is not available.  

---

## License

MIT © Snoozeds

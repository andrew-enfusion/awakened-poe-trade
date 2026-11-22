# ![Awakener's Orb](https://web.poecdn.com/image/Art/2DItems/Currency/TransferOrb.png) Awakened PoE Trade

## Fork status

This is [andrew-enfusion's fork](https://github.com/andrew-enfusion/awakened-poe-trade)
of [SnosMe/awakened-poe-trade](https://github.com/SnosMe/awakened-poe-trade).
The initial review documents the existing application before feature development.
The first implementation pass isolates the fork's desktop identity, settings,
browser session and update policy. A custom pricing feature has not been selected.
Fork features now live in dedicated extension folders. A daily upstream workflow
prepares a protected review branch and draft pull request, with tests dispatched
before an update is merged. It never replaces `master` automatically.

- [Architecture and data flow](./ARCHITECTURE.md)
- [Source review, findings, and validation](./fork-docs/review.md)
- [Development approach and proposed next steps](./fork-docs/development.md)
- [Fork identity, update policy and validation](./fork-docs/identity.md)
- [Extension authoring and upstream updates](./fork-docs/extensions-and-updates.md)
- [Fork changelog](./CHANGELOG.md)

The MIT copyright and license notice remain in [LICENSE](./LICENSE).
The download links and showcase below refer to the upstream application.
Use `npm run package` in `main` to select the fork's packaging configuration.
Publishing and application updates are disabled by default. See the identity
document for validation results and the remaining Windows packaging limitation.

This product isn't affiliated with or endorsed by Grinding Gear Games in any way.

## Upstream project

[![](https://user-images.githubusercontent.com/4292308/153364874-dde23599-278c-4350-8d86-dadbc4b978b3.svg)](https://somsubhra.github.io/github-release-stats/?username=SnosMe&repository=awakened-poe-trade)
[![](https://user-images.githubusercontent.com/4292308/153364769-e4fe1e82-1bbc-46ac-8a3c-f5a98a5667cc.svg)](https://patreon.com/awakened_poe_trade)
[![](https://user-images.githubusercontent.com/4292308/153364565-7a545d26-e617-4a33-a919-ff90d8feda3d.svg)](https://github.com/SnosMe/awakened-poe-trade/issues/22)


➡ [Download for Windows & Linux](https://snosme.github.io/awakened-poe-trade/download) ⬅

## Tool showcase

| Gem | Rare | Unique | Currency |
|-----|------|--------|----------|
| ![](https://i.imgur.com/LTsH2DZ.png) | ![](https://i.imgur.com/2XL5Wl8.png) | ![](https://i.imgur.com/UTV6prE.png) | ![](https://i.imgur.com/dQ9Sns6.png) |

### Development

See [DEVELOPING.md](./DEVELOPING.md)

### Acknowledgments

- [libuiohook](https://github.com/kwhat/libuiohook)
- [RePoE](https://github.com/brather1ng/RePoE)
- [poeprices.info](https://www.poeprices.info/)
- [poe.ninja](https://poe.ninja/)

![](https://i.imgur.com/MATqhv7.png)

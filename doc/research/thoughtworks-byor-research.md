# ThoughtWorks BYOR interoperability notes

Checked against the official `thoughtworks/build-your-own-radar` repository on
2026-07-23. These are interoperability facts, not Radarsmith requirements.

## Default structure

The current BYOR graph configuration defaults to four quadrants:

1. Techniques
2. Platforms
3. Tools
4. Languages & Frameworks

It defaults to four rings, ordered from the center outward:

1. Adopt
2. Trial
3. Assess
4. Caution

The renderer requires exactly four quadrants and between one and four rings. A
self-hosted BYOR instance can replace the names through configuration, so the
names are defaults rather than domain invariants.

Sources:

- [Graph configuration](https://github.com/thoughtworks/build-your-own-radar/blob/master/src/graphing/config.js)
- [Radar quadrant validation](https://github.com/thoughtworks/build-your-own-radar/blob/master/src/models/radar.js)
- [BYOR configuration instructions](https://github.com/thoughtworks/build-your-own-radar#more-complex-usage)

## Input data

BYOR accepts Google Sheets, CSV, and JSON. Each input represents a collection of
blips rather than a complete editable radar document. The required fields are
`name`, `ring`, `quadrant`, and `description`, plus at least one of `isNew` or
`status`.

`status` is an optional movement marker with the values `New`, `Moved In`,
`Moved Out`, and `No Change`. It describes a rendered comparison; BYOR does not
derive or retain edition history.

Sources:

- [BYOR data setup and formats](https://github.com/thoughtworks/build-your-own-radar#how-to-use)
- [Header validation](https://github.com/thoughtworks/build-your-own-radar/blob/master/src/util/contentValidator.js)
- [Blip status behavior](https://github.com/thoughtworks/build-your-own-radar/blob/master/src/models/blip.js)

## Consequence for Radarsmith

A blank MVP radar can be seeded with the default quadrant and ring labels above
without copying any published ThoughtWorks radar content. Radarsmith should keep
quadrants and rings as explicit owned data, as already proposed, rather than
copying BYOR's input-driven renderer model. Future BYOR adapters can map edition
comparisons to `status`; they do not need to shape the MVP persistence model.

import { create } from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces";

export interface AdaptionConfig {
  mimeType: string;
  represententions?: { width: number; height: number }[];
}

export class MPD {
  private root: XMLBuilder;
  container: "mp4" = "mp4";
  ext: string = "m4s";
  availabilityStartTime = new Date().toISOString();
  publishTime = new Date().toISOString();
  segmentationTimeLine: {
    /**duration ms */
    d: number;
    /**
     * timestamp ms
     * dの合計値
     */
    t?: number;
  }[] = [];
  /**mimetypes */
  adaptions: AdaptionConfig[] = [
    { mimeType: "video/vp8", represententions: [{ width: 1280, height: 720 }] },
    { mimeType: "audio/opus" },
  ];
  minimumUpdatePeriod = 1;
  minBufferTime = 2;
  width = 1920;
  height = 1080;

  get initialization() {
    return `init.${this.ext}`;
  }

  get media() {
    return `$RepresentationID$_$Number$.${this.ext}`;
  }

  constructor(props: Partial<MPD> = {}) {
    Object.assign(this, props);

    this.root = this.create();
  }

  getInit(index: number) {
    const adaption = this.adaptions[index];
    return `${mimeType2ContentType(adaption.mimeType)}/${this.initialization}`;
  }

  getMedia({
    adaption: index,
    current,
    representatoin,
  }: {
    adaption: number;
    current: number;
    representatoin?: number;
  }) {
    const adaption = this.adaptions[index];
    return `${mimeType2ContentType(adaption.mimeType)}/${this.media
      .replace("$RepresentationID$", representatoin?.toString() ?? "0")
      .replace("$Number$", current.toString())}`;
  }

  private create() {
    return create({
      MPD: {
        ...toAttributes({
          "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          xmlns: "urn:mpeg:dash:schema:mpd:2011",
          "xsi:schemaLocation": "urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd",
          profiles:
            "urn:mpeg:dash:profile:isoff-live:2011,http://dashif.org/guidelines/dash-if-simple",
          type: "dynamic",
          availabilityStartTime: this.availabilityStartTime,
          publishTime: this.publishTime,
          minimumUpdatePeriod: `PT${this.minimumUpdatePeriod}S`,
          minBufferTime: `PT${this.minBufferTime}S`,
        }),
        Period: {
          ...toAttributes({ start: "PT0S", id: "0" }),
          AdaptationSet: this.adaptions.map((codec, i) => ({
            ...toAttributes({
              mimeType: `${mimeType2ContentType(codec.mimeType)}/${
                this.container
              }`,
            }),
            Representation: {
              ...toAttributes({
                id: "0",
                width: (codec.represententions?.[0] ?? {}).width,
                height: (codec.represententions?.[0] ?? {}).height,
                codecs: mimeType2Codec(codec.mimeType),
              }),
              SegmentTemplate: {
                ...toAttributes({
                  timescale: 1000,
                  initialization: this.getInit(i),
                  media: `${mimeType2ContentType(codec.mimeType)}/${
                    this.media
                  }`,
                  presentationTimeOffset: 0,
                }),
                SegmentTimeline: {
                  S: this.segmentationTimeLine.map((s) => ({
                    ...toAttributes({ d: s.d, t: s.t }),
                  })),
                },
              },
            },
          })),
        },
        UTCTiming: {
          ...toAttributes({
            schemeIdUri: "urn:mpeg:dash:utc:http-iso:2014",
            value: "https://time.akamai.com/?iso&ms",
          }),
        },
      },
    });
  }

  build() {
    this.root = this.create();
    return this.root.end({ prettyPrint: true });
  }
}

const toAttributes = (o: object) =>
  Object.entries(o).reduce((acc: any, [k, v]) => {
    acc["@" + k] = v;
    return acc;
  }, {});

const mimeType2Codec = (mimeType: string) => {
  return mimeType.split("/")[1];
};

const mimeType2ContentType = (mimeType: string) => {
  return mimeType.split("/")[0];
};

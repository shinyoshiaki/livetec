import { createCipheriv, randomBytes, randomFillSync } from "crypto";

import { BitWriter2, BufferChain } from "../../../common/src";
import { OpusRtpPayload } from "..";
import * as EBML from "./ebml";

export class WEBMBuilder {
  readonly ebmlHeader = EBML.build(
    EBML.element(EBML.ID.EBML, [
      EBML.element(EBML.ID.EBMLVersion, EBML.number(1)),
      EBML.element(EBML.ID.EBMLReadVersion, EBML.number(1)),
      EBML.element(EBML.ID.EBMLMaxIDLength, EBML.number(4)),
      EBML.element(EBML.ID.EBMLMaxSizeLength, EBML.number(8)),
      EBML.element(EBML.ID.DocType, EBML.string("webm")),
      EBML.element(EBML.ID.DocTypeVersion, EBML.number(2)),
      EBML.element(EBML.ID.DocTypeReadVersion, EBML.number(2)),
    ])
  );
  trackEntries: EBML.EBMLData[] = [];
  private trackIvs: { [trackNumber: number]: Uint32Array } = {};
  trackKeyIds: { [trackNumber: number]: Buffer } = {};
  encryptionKey?: Buffer;
  readonly encryptionKeyID = randomBytes(16);

  constructor(
    tracks: {
      width?: number;
      height?: number;
      kind: "audio" | "video";
      codec: SupportedCodec;
      trackNumber: number;
    }[],
    encryptionKey?: Buffer
  ) {
    this.encryptionKey = encryptionKey;

    this.trackEntries = tracks.map(
      ({ width, height, kind, codec, trackNumber }) => {
        const track = this.createTrackEntry(kind, trackNumber, codec, {
          width,
          height,
        });
        const ivCounter = new Uint32Array(2);
        randomFillSync(ivCounter);
        this.trackIvs[trackNumber] = ivCounter;

        return track;
      }
    );
  }

  createTrackEntry(
    kind: string,
    trackNumber: number,
    codec: string,
    {
      width,
      height,
    }: Partial<{
      kind: string;
      width: number;
      height: number;
    }> = {}
  ) {
    const trackElements: EBML.EBMLData[] = [];

    if (kind === "video") {
      if (!width || !height) {
        throw new Error();
      }
      trackElements.push(
        EBML.element(EBML.ID.Video, [
          EBML.element(EBML.ID.PixelWidth, EBML.number(width)),
          EBML.element(EBML.ID.PixelHeight, EBML.number(height)),
        ])
      );
    } else {
      trackElements.push(
        EBML.element(EBML.ID.Audio, [
          EBML.element(EBML.ID.SamplingFrequency, EBML.float(48000.0)),
          EBML.element(EBML.ID.Channels, EBML.number(2)),
        ])
      );
      // only support OPUS
      trackElements.push(
        EBML.element(
          EBML.ID.CodecPrivate,
          EBML.bytes(OpusRtpPayload.createCodecPrivate())
        )
      );
    }

    if (this.encryptionKey) {
      const encryptionKeyID = this.encryptionKeyID;
      this.trackKeyIds[trackNumber] = encryptionKeyID;

      trackElements.push(
        EBML.element(
          EBML.ID.ContentEncodings,
          EBML.element(EBML.ID.ContentEncoding, [
            EBML.element(EBML.ID.ContentEncodingOrder, EBML.number(0)),
            EBML.element(EBML.ID.ContentEncodingScope, EBML.number(1)),
            EBML.element(EBML.ID.ContentEncodingType, EBML.number(1)),
            EBML.element(EBML.ID.ContentEncryption, [
              EBML.element(EBML.ID.EncryptionAlgorithm, EBML.number(5)),
              EBML.element(
                EBML.ID.EncryptionKeyID,
                EBML.bytes(encryptionKeyID)
              ),
              EBML.element(
                EBML.ID.ContentEncAESSettings,
                EBML.element(EBML.ID.AESSettingsCipherMode, EBML.number(1))
              ),
            ]),
          ])
        )
      );
    }

    const trackEntry = EBML.element(EBML.ID.TrackEntry, [
      EBML.element(EBML.ID.TrackNumber, EBML.number(trackNumber)),
      EBML.element(EBML.ID.TrackUID, EBML.number(trackNumber)),
      EBML.element(EBML.ID.CodecName, EBML.string(codec)),
      EBML.element(EBML.ID.TrackType, EBML.number(kind === "video" ? 1 : 2)),
      EBML.element(
        EBML.ID.CodecID,
        EBML.string(`${kind === "video" ? "V" : "A"}_${codec}`)
      ),
      ...trackElements,
    ]);
    return trackEntry;
  }

  createSegment(
    /**ms */
    duration?: number
  ) {
    const elements = [
      EBML.element(EBML.ID.TimecodeScale, EBML.number(millisecond)),
      EBML.element(EBML.ID.MuxingApp, EBML.string("webrtc")),
      EBML.element(EBML.ID.WritingApp, EBML.string("webrtc")),
    ];
    if (duration != undefined) {
      elements.push(EBML.element(EBML.ID.Duration, EBML.float(duration)));
    }
    return EBML.build(
      EBML.unknownSizeElement(EBML.ID.Segment, [
        EBML.element(EBML.ID.SeekHead, []),
        EBML.element(EBML.ID.Info, elements),
        EBML.element(EBML.ID.Tracks, this.trackEntries),
      ])
    );
  }

  createDuration(
    /**ms */
    duration: number
  ) {
    return EBML.build(EBML.element(EBML.ID.Duration, EBML.float(duration)));
  }

  createCuePoint(
    relativeTimestamp: number,
    trackNumber: number,
    clusterPosition: number,
    blockNumber: number
  ) {
    return EBML.element(EBML.ID.CuePoint, [
      EBML.element(EBML.ID.CueTime, EBML.number(relativeTimestamp)),
      EBML.element(EBML.ID.CueTrackPositions, [
        EBML.element(EBML.ID.CueTrack, EBML.number(trackNumber)),
        EBML.element(EBML.ID.CueClusterPosition, EBML.number(clusterPosition)),
        EBML.element(EBML.ID.CueBlockNumber, EBML.number(blockNumber)),
      ]),
    ]);
  }

  createCues(cuePoints: EBML.EBMLData[]) {
    return EBML.build(EBML.element(EBML.ID.Cues, cuePoints));
  }

  createCluster(timecode: number) {
    return EBML.build(
      EBML.unknownSizeElement(EBML.ID.Cluster, [
        EBML.element(EBML.ID.Timecode, EBML.number(timecode)),
      ])
    );
  }

  createSimpleBlock(
    frame: Buffer,
    isKeyframe: boolean,
    trackNumber: number,
    relativeTimestamp: number
  ) {
    const elementId = Buffer.from([0xa3]);

    if (this.encryptionKey) {
      // 4.7 Signal Byte Format
      //  0 1 2 3 4 5 6 7
      // +-+-+-+-+-+-+-+-+
      // |X|   RSV   |P|E|
      // +-+-+-+-+-+-+-+-+
      const singleByte = new BitWriter2(8).set(0).set(0, 5).set(0).set(1);

      const iv = Buffer.alloc(16);
      const ivCounter = this.trackIvs[trackNumber];
      iv.writeUInt32BE(ivCounter[0], 0);
      iv.writeUInt32BE(ivCounter[1], 4);
      ivCounter[1]++;
      if (ivCounter[1] === 0) {
        ivCounter[0]++;
      }

      const cipher = createCipheriv("AES-128-CTR", this.encryptionKey, iv);

      frame = Buffer.concat([
        singleByte.buffer,
        iv.subarray(0, 8),
        cipher.update(frame),
        cipher.final(),
      ]);
    }

    const contentSize: Uint8Array = EBML.vintEncodedNumber(
      1 + 2 + 1 + frame.length
    ).bytes;

    const keyframe = isKeyframe ? 1 : 0;
    const flags = new BitWriter2(8)
      .set(keyframe)
      .set(0, 3)
      .set(0)
      .set(0, 2)
      .set(0);

    const simpleBlock = Buffer.concat([
      elementId,
      contentSize,
      EBML.vintEncodedNumber(trackNumber).bytes,
      new BufferChain(2).writeInt16BE(relativeTimestamp).buffer,
      new BufferChain(1).writeUInt8(flags.value).buffer,
      frame,
    ]);
    return simpleBlock;
  }
}

export const supportedCodecs = [
  "MPEG4/ISO/AVC",
  "VP8",
  "VP9",
  "AV1",
  "OPUS",
] as const;
export type SupportedCodec = (typeof supportedCodecs)[number];
const millisecond = 1000000;
